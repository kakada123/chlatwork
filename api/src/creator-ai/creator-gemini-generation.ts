import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiError,
  GoogleGenAI,
  type GenerateContentResponse,
} from '@google/genai';
import type { AiFeature } from '@prisma/client';
import { configuredAiKey } from '../config/ai-provider';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import { creatorAiUnavailable } from './creator-ai.errors';
import { CreatorProviderError } from './creator-ai-gateway.service';
import type {
  CreatorGatewayResult,
  CreatorProviderUsage,
} from './creator-ai.types';
import type { CreatorPromptSpec } from './creator-prompts';
import { CreatorResultValidationError } from './creator-result-validation';
import { CreatorStructuredResponseError } from './creator-structured-response';

const logger = new Logger('CreatorGeminiGeneration');
const DEFAULT_TEXT_MODEL = 'gemini-3.5-flash-lite';

function number(config: ConfigService, key: string, fallback: number): number {
  const value = Number(config.get(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function parseResponse<T>(
  response: GenerateContentResponse,
  spec: CreatorPromptSpec<T>,
): T {
  const finishReason = response.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    throw new CreatorStructuredResponseError('OUTPUT_TOKEN_LIMIT');
  }
  if (finishReason && finishReason !== 'STOP') {
    throw new CreatorStructuredResponseError(
      ['SAFETY', 'PROHIBITED_CONTENT', 'RECITATION'].includes(finishReason)
        ? 'CONTENT_FILTERED'
        : 'RESPONSE_NOT_COMPLETED',
    );
  }
  if (!response.text?.trim()) {
    throw new CreatorStructuredResponseError('EMPTY_OUTPUT');
  }
  let value: unknown;
  try {
    value = JSON.parse(response.text);
  } catch {
    throw new CreatorStructuredResponseError('INVALID_JSON');
  }
  try {
    return spec.parse(value);
  } catch (error) {
    throw new CreatorStructuredResponseError(
      'RESULT_VALIDATION_FAILED',
      error instanceof CreatorResultValidationError ? error : undefined,
    );
  }
}

function usageFor(
  response: GenerateContentResponse,
  config: ConfigService,
  model: string,
  premium: boolean,
  durationMs: number,
): CreatorProviderUsage {
  const metadata = response.usageMetadata;
  const inputTokens = metadata?.promptTokenCount ?? null;
  const cachedInputTokens = metadata?.cachedContentTokenCount ?? null;
  // Gemini bills thoughts as output tokens even though they are not in text.
  const outputTokens = metadata
    ? (metadata.candidatesTokenCount ?? 0) + (metadata.thoughtsTokenCount ?? 0)
    : null;
  const inputRate = number(
    config,
    premium
      ? 'GEMINI_PREMIUM_INPUT_USD_PER_1M'
      : 'GEMINI_TEXT_INPUT_USD_PER_1M',
    number(config, 'GEMINI_TEXT_INPUT_USD_PER_1M', 0.3),
  );
  const outputRate = number(
    config,
    premium
      ? 'GEMINI_PREMIUM_OUTPUT_USD_PER_1M'
      : 'GEMINI_TEXT_OUTPUT_USD_PER_1M',
    number(config, 'GEMINI_TEXT_OUTPUT_USD_PER_1M', 2.5),
  );
  return {
    provider: 'GEMINI',
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    audioSeconds: null,
    // Count cached inputs at the full rate so the budget estimate stays conservative.
    estimatedProviderCostUsd:
      ((inputTokens ?? 0) * inputRate + (outputTokens ?? 0) * outputRate) /
      1_000_000,
    providerRequestId: response.responseId ?? null,
    durationMs,
  };
}

export async function generateStructuredWithGemini<T>(
  config: ConfigService,
  feature: AiFeature,
  requestId: string,
  spec: CreatorPromptSpec<T>,
  image?: { bytes: Buffer; mimeType: string },
): Promise<CreatorGatewayResult<T>> {
  if (String(config.get('AI_ENABLED')).toLowerCase() !== 'true') {
    throw creatorAiUnavailable();
  }
  const apiKey = configuredAiKey(config, 'GEMINI_API_KEY');
  if (!apiKey) throw creatorAiUnavailable();
  const standardModel =
    config.get<string>('GEMINI_TEXT_MODEL')?.trim() || DEFAULT_TEXT_MODEL;
  const model = spec.premium
    ? config.get<string>('GEMINI_PREMIUM_TEXT_MODEL')?.trim() || standardModel
    : standardModel;
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: number(
        config,
        'AI_PROVIDER_TIMEOUT_MS',
        CREATOR_AI_DEFAULTS.providerTimeoutMs,
      ),
      // Retries can create a second charge under one Creator reservation.
      retryOptions: { attempts: 1 },
    },
  });
  const startedAt = Date.now();
  let response: GenerateContentResponse | undefined;
  let usage: CreatorProviderUsage | undefined;
  try {
    response = await client.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: spec.input },
            ...(image
              ? [
                  {
                    inlineData: {
                      mimeType: image.mimeType,
                      data: image.bytes.toString('base64'),
                    },
                  },
                ]
              : []),
          ],
        },
      ],
      config: {
        systemInstruction: spec.instructions,
        maxOutputTokens: spec.maxOutputTokens,
        responseMimeType: 'application/json',
        responseJsonSchema: spec.schema,
        ...(model.startsWith('gemini-2.5-flash')
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    });
    usage = usageFor(
      response,
      config,
      model,
      spec.premium,
      Date.now() - startedAt,
    );
    return { data: parseResponse(response, spec), usage };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const status = error instanceof ApiError ? error.status : null;
    logger.error('Creator Gemini request failed', {
      requestId,
      feature,
      model,
      durationMs,
      providerStatus: status,
      providerFailureReason:
        error instanceof CreatorStructuredResponseError
          ? error.reason
          : status === 404
            ? 'GEMINI_MODEL_UNAVAILABLE'
            : status !== null
              ? 'PROVIDER_HTTP_ERROR'
              : 'LOCAL_PROCESSING_ERROR',
      maxOutputTokens: spec.maxOutputTokens,
      responseReceived: Boolean(response),
      outputTokens: usage?.outputTokens ?? null,
      validationField:
        error instanceof CreatorStructuredResponseError
          ? (error.validation?.field ?? null)
          : null,
      validationIssue:
        error instanceof CreatorStructuredResponseError
          ? (error.validation?.issue ?? null)
          : null,
    });
    throw new CreatorProviderError(
      'Gemini request failed',
      durationMs,
      usage ? { ...usage, durationMs } : undefined,
      error instanceof CreatorStructuredResponseError ? error : undefined,
    );
  }
}
