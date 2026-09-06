import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import OpenAI from 'openai';
import type { Response } from 'openai/resources/responses/responses';
import type { AiFeature } from '@prisma/client';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import { creatorAiUnavailable } from './creator-ai.errors';
import type { CreatorPromptSpec } from './creator-prompts';
import type { CreatorLanguage } from './dto/creator-ai.dto';
import { transcriptionErrorDetails } from './creator-transcription-error';
import {
  CreatorStructuredResponseError,
  parseCreatorStructuredResponse,
  structuredResponseDiagnostics,
} from './creator-structured-response';
import type {
  CreatorGatewayResult,
  CreatorTranscript,
  CreatorProviderUsage,
} from './creator-ai.types';

export class CreatorProviderError extends Error {
  constructor(
    message: string,
    readonly durationMs: number,
    readonly usage?: CreatorProviderUsage,
  ) {
    super(message);
    this.name = 'CreatorProviderError';
  }
}

@Injectable()
export class CreatorAiGatewayService {
  private readonly logger = new Logger(CreatorAiGatewayService.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  async generateStructured<T>(
    feature: AiFeature,
    requestId: string,
    spec: CreatorPromptSpec<T>,
    image?: { bytes: Buffer; mimeType: string },
  ): Promise<CreatorGatewayResult<T>> {
    const startedAt = Date.now();
    const model = this.model(spec.premium);
    let response: (Response & { _request_id?: string | null }) | undefined;
    let providerUsage: CreatorProviderUsage | undefined;
    try {
      const input = image
        ? [
            {
              role: 'user' as const,
              content: [
                { type: 'input_text' as const, text: spec.input },
                {
                  type: 'input_image' as const,
                  image_url: `data:${image.mimeType};base64,${image.bytes.toString('base64')}`,
                  detail: 'auto' as const,
                },
              ],
            },
          ]
        : spec.input;
      response = await this.openAi().responses.create(
        {
          model,
          instructions: spec.instructions,
          input,
          max_output_tokens: spec.maxOutputTokens,
          store: false,
          text: {
            format: {
              type: 'json_schema',
              name: spec.name,
              strict: true,
              schema: spec.schema,
            },
          },
        },
        { headers: { 'X-Client-Request-Id': requestId } },
      );
      const usage = response.usage;
      providerUsage = {
        provider: 'OPENAI',
        model,
        inputTokens: usage?.input_tokens ?? null,
        cachedInputTokens: usage?.input_tokens_details?.cached_tokens ?? null,
        outputTokens: usage?.output_tokens ?? null,
        audioSeconds: null,
        estimatedProviderCostUsd: this.textCost(
          usage?.input_tokens ?? 0,
          usage?.output_tokens ?? 0,
          spec.premium,
        ),
        providerRequestId: response._request_id ?? response.id ?? null,
        durationMs: Date.now() - startedAt,
      };
      const parsed = parseCreatorStructuredResponse(response, spec);
      return { data: parsed, usage: providerUsage };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.error('Creator provider request failed', {
        requestId,
        feature,
        model,
        durationMs,
        providerStatus: this.providerStatus(error),
        providerFailureReason:
          error instanceof CreatorStructuredResponseError
            ? error.reason
            : error instanceof OpenAI.APIConnectionTimeoutError
              ? 'PROVIDER_TIMEOUT'
              : error instanceof OpenAI.APIConnectionError
                ? 'PROVIDER_CONNECTION_ERROR'
                : this.providerStatus(error) !== null
                  ? 'PROVIDER_HTTP_ERROR'
                  : 'LOCAL_PROCESSING_ERROR',
        maxOutputTokens: spec.maxOutputTokens,
        ...structuredResponseDiagnostics(response),
      });
      throw new CreatorProviderError(
        'OpenAI request failed',
        durationMs,
        providerUsage ? { ...providerUsage, durationMs } : undefined,
      );
    }
  }

  async transcribe(
    feature: AiFeature,
    requestId: string,
    audioPath: string,
    durationSeconds: number,
    language: CreatorLanguage = 'KHMER',
  ): Promise<CreatorGatewayResult<CreatorTranscript>> {
    const startedAt = Date.now();
    const model = this.config.get<string>('OPENAI_TRANSCRIPTION_MODEL')!.trim();
    let languageHintUsed = language !== 'ENGLISH';
    const submit = async () => {
      // A rejected upload may consume its stream. Each attempt owns a fresh one.
      const file = createReadStream(audioPath);
      try {
        return await this.openAi().audio.transcriptions.create(
          {
            file,
            model,
            response_format: 'verbose_json',
            timestamp_granularities: ['segment'],
            ...(languageHintUsed ? { language: 'km' } : {}),
            prompt:
              language === 'ENGLISH'
                ? 'Preserve the original spoken language, names, and product terms.'
                : 'សំឡេងនិយាយជាភាសាខ្មែរ។ សរសេរជាអក្សរខ្មែរ ហើយរក្សាពាក្យអង់គ្លេស ឈ្មោះ និងពាក្យបច្ចេកទេសតាមសំឡេងដើម។',
          },
          { headers: { 'X-Client-Request-Id': requestId }, maxRetries: 0 },
        );
      } finally {
        file.destroy();
      }
    };
    try {
      let response: Awaited<ReturnType<typeof submit>>;
      try {
        response = await submit();
      } catch (error) {
        const details = transcriptionErrorDetails(error);
        if (
          model !== 'whisper-1' ||
          !languageHintUsed ||
          details.providerFailureReason !== 'LANGUAGE_HINT_UNSUPPORTED'
        )
          throw error;
        // Only retry a definite parameter rejection, never an uncertain timeout
        // or provider failure. Worker/output guards still reject wrong-script text.
        this.logger.warn(
          'Creator transcription language hint rejected; retrying without hint',
          { requestId, feature, model, ...details },
        );
        languageHintUsed = false;
        response = await submit();
      }
      const segments = (response.segments ?? [])
        .filter(
          (segment) =>
            Number.isFinite(segment.start) &&
            Number.isFinite(segment.end) &&
            segment.end > segment.start &&
            Boolean(segment.text.trim()),
        )
        .map((segment) => ({
          start: segment.start,
          end: segment.end,
          text: segment.text.trim(),
        }));
      if (!response.text.trim() || !segments.length) {
        throw new Error('Transcription did not include timestamped segments');
      }
      return {
        data: { text: response.text.trim(), segments },
        usage: {
          provider: 'OPENAI',
          model,
          inputTokens: null,
          cachedInputTokens: null,
          outputTokens: null,
          audioSeconds: Math.ceil(durationSeconds),
          estimatedProviderCostUsd:
            (durationSeconds / 60) *
            this.number('OPENAI_TRANSCRIPTION_USD_PER_MINUTE', 0),
          providerRequestId: response._request_id ?? null,
          durationMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.error('Creator transcription request failed', {
        requestId,
        feature,
        model,
        durationMs,
        languageHintUsed,
        ...transcriptionErrorDetails(error),
      });
      throw new CreatorProviderError('OpenAI transcription failed', durationMs);
    }
  }

  private openAi() {
    if (String(this.config.get('AI_ENABLED')).toLowerCase() !== 'true') {
      throw creatorAiUnavailable();
    }
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
      if (!apiKey || /^(dummy_|replace_)/i.test(apiKey)) {
        throw creatorAiUnavailable();
      }
      this.client = new OpenAI({
        apiKey,
        timeout: this.number(
          'AI_PROVIDER_TIMEOUT_MS',
          CREATOR_AI_DEFAULTS.providerTimeoutMs,
        ),
        // Automatic retries can create an untracked second provider request.
        maxRetries: 0,
      });
    }
    return this.client;
  }

  private model(premium: boolean) {
    const standard = this.config.get<string>('OPENAI_TEXT_MODEL')?.trim();
    if (!standard) throw creatorAiUnavailable();
    return premium
      ? this.config.get<string>('OPENAI_PREMIUM_TEXT_MODEL')?.trim() || standard
      : standard;
  }

  private textCost(input: number, output: number, premium: boolean) {
    const inputRate = this.number(
      premium
        ? 'OPENAI_PREMIUM_INPUT_USD_PER_1M'
        : 'OPENAI_TEXT_INPUT_USD_PER_1M',
      0,
    );
    const outputRate = this.number(
      premium
        ? 'OPENAI_PREMIUM_OUTPUT_USD_PER_1M'
        : 'OPENAI_TEXT_OUTPUT_USD_PER_1M',
      0,
    );
    return (input * inputRate + output * outputRate) / 1_000_000;
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }

  private providerStatus(error: unknown) {
    if (!error || typeof error !== 'object' || !('status' in error))
      return null;
    const status = Number((error as { status?: unknown }).status);
    return Number.isInteger(status) ? status : null;
  }
}
