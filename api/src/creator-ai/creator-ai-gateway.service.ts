import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'node:fs';
import OpenAI from 'openai';
import type { AiFeature } from '@prisma/client';
import { creatorAiUnavailable } from './creator-ai.errors';
import type { CreatorPromptSpec } from './creator-prompts';
import type {
  CreatorGatewayResult,
  CreatorTranscript,
} from './creator-ai.types';

export class CreatorProviderError extends Error {
  constructor(
    message: string,
    readonly durationMs: number,
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
      const response = await this.openAi().responses.create(
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
      const parsed = spec.parse(JSON.parse(response.output_text) as unknown);
      const usage = response.usage;
      return {
        data: parsed,
        usage: {
          provider: 'OPENAI',
          model,
          inputTokens: usage?.input_tokens ?? null,
          cachedInputTokens:
            usage?.input_tokens_details.cached_tokens ?? null,
          outputTokens: usage?.output_tokens ?? null,
          audioSeconds: null,
          estimatedProviderCostUsd: this.textCost(
            usage?.input_tokens ?? 0,
            usage?.output_tokens ?? 0,
            spec.premium,
          ),
          providerRequestId: response._request_id ?? response.id ?? null,
          durationMs: Date.now() - startedAt,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      this.logger.error('Creator provider request failed', {
        requestId,
        feature,
        model,
        durationMs,
        providerStatus: this.providerStatus(error),
      });
      throw new CreatorProviderError(
        'OpenAI request failed',
        durationMs,
      );
    }
  }

  async transcribe(
    feature: AiFeature,
    requestId: string,
    audioPath: string,
    durationSeconds: number,
  ): Promise<CreatorGatewayResult<CreatorTranscript>> {
    const startedAt = Date.now();
    const model = this.config.get<string>('OPENAI_TRANSCRIPTION_MODEL')!.trim();
    try {
      const response = await this.openAi().audio.transcriptions.create(
        {
          file: createReadStream(audioPath),
          model,
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
          prompt:
            'Cambodian creator speech. Preserve natural Khmer, names, product words, and commonly mixed English terms.',
        },
        { headers: { 'X-Client-Request-Id': requestId } },
      );
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
        providerStatus: this.providerStatus(error),
      });
      throw new CreatorProviderError(
        'OpenAI transcription failed',
        durationMs,
      );
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
        timeout: this.number('AI_PROVIDER_TIMEOUT_MS', 60_000),
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
    if (!error || typeof error !== 'object' || !('status' in error)) return null;
    const status = Number((error as { status?: unknown }).status);
    return Number.isInteger(status) ? status : null;
  }
}
