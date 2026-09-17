import { Logger } from '@nestjs/common';
import { ApiError, GoogleGenAI } from '@google/genai';
import type { CreatorLanguage } from './dto/creator-ai.dto';
import type {
  CreatorGatewayResult,
  CreatorTranscript,
} from './creator-ai.types';
import { CreatorProviderError } from './creator-ai-gateway.service';
import { containsThaiScript } from './creator-output-language';
import {
  CreatorTranscriptionResponseError,
  parseCreatorTranscription,
} from './creator-transcription-response';

const logger = new Logger('CreatorGeminiTranscription');

// Use the model's supported BCP-47 code. English uses auto-detection.
function languageCode(language: CreatorLanguage): string | undefined {
  if (language === 'ENGLISH') return undefined;
  return 'km-KH';
}

type GeminiInteraction = {
  status?: string;
  output_text?: string;
  steps?: Array<{
    type: string;
    content?: Array<{
      type: string;
      annotations?: Array<{
        type: string;
        text?: string;
        start_offset?: string;
        end_offset?: string;
      }>;
    }>;
  }>;
};

class GeminiInteractionStatusError extends Error {
  constructor(readonly status: string | undefined) {
    super('Gemini transcription interaction did not complete');
  }
}

class GeminiTranscriptionScriptError extends Error {}

function timestampSeconds(value: string | undefined): number | null {
  if (!value || !/^\d+(?:\.\d+)?s$/.test(value)) return null;
  const seconds = Number(value.slice(0, -1));
  return Number.isFinite(seconds) ? seconds : null;
}

/** Keep response diagnostics useful without logging transcript or audio content. */
function interactionDiagnostics(interaction: GeminiInteraction) {
  let modelOutputTextBlocks = 0;
  let wordAnnotations = 0;
  let invalidWordAnnotations = 0;
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue;
    for (const content of step.content ?? []) {
      if (content.type !== 'text') continue;
      modelOutputTextBlocks++;
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== 'word_info') continue;
        wordAnnotations++;
        const start = timestampSeconds(annotation.start_offset);
        const end = timestampSeconds(annotation.end_offset);
        if (
          start === null ||
          end === null ||
          end <= start ||
          !annotation.text?.trim()
        ) {
          invalidWordAnnotations++;
        }
      }
    }
  }
  return {
    interactionStatus: interaction.status ?? null,
    transcriptCharacters: interaction.output_text?.length ?? 0,
    modelOutputTextBlocks,
    wordAnnotations,
    invalidWordAnnotations,
  };
}

/** Group provider word timings into short segments for cleanup and SRT output. */
function transcriptFromInteraction(
  interaction: GeminiInteraction,
): CreatorTranscript {
  const segments: CreatorTranscript['segments'] = [];
  let segment: CreatorTranscript['segments'][number] | null = null;

  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue;
    for (const content of step.content ?? []) {
      if (content.type !== 'text') continue;
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== 'word_info') continue;
        const start = timestampSeconds(annotation.start_offset);
        const end = timestampSeconds(annotation.end_offset);
        const word = annotation.text?.trim();
        if (start === null || end === null || end <= start || !word) {
          throw new CreatorTranscriptionResponseError(
            'INVALID_TRANSCRIPT_SEGMENTS',
          );
        }
        if (
          segment &&
          (start - segment.end > 1.5 ||
            end - segment.start > 6 ||
            segment.text.length + word.length > 120)
        ) {
          segments.push(segment);
          segment = null;
        }
        if (segment) {
          segment.text += ` ${word}`;
          segment.end = Math.max(segment.end, end);
        } else {
          segment = { start, end, text: word };
        }
      }
    }
  }
  if (segment) segments.push(segment);
  // Keep the provider's full text; the cleanup stage restores natural spacing
  // within the timed segments, including Khmer words.
  const transcript = parseCreatorTranscription({
    text: interaction.output_text,
    segments,
  });
  // Reject script contamination before cleanup or subtitle generation can use it.
  if (containsThaiScript(transcript))
    throw new GeminiTranscriptionScriptError();
  return transcript;
}

/** Classify a Gemini SDK error into a safe loggable reason string. */
function classifyGeminiError(error: unknown): {
  providerFailureReason: string;
  providerStatus: number | null;
} {
  // Files API errors use ApiError.status; Interactions API errors use statusCode.
  const status =
    error instanceof ApiError
      ? error.status
      : error instanceof Error &&
          'statusCode' in error &&
          typeof error.statusCode === 'number'
        ? error.statusCode
        : null;
  if (status !== null) {
    const reason =
      status === 400
        ? 'GEMINI_BAD_REQUEST'
        : status === 401 || status === 403
          ? 'GEMINI_AUTH_ERROR'
          : status === 404
            ? 'GEMINI_MODEL_NOT_FOUND'
            : status === 429
              ? 'GEMINI_RATE_LIMITED'
              : status >= 500
                ? 'GEMINI_SERVER_ERROR'
                : 'GEMINI_HTTP_ERROR';
    return { providerFailureReason: reason, providerStatus: status };
  }
  if (error instanceof GeminiInteractionStatusError) {
    return {
      providerFailureReason:
        error.status === 'failed'
          ? 'GEMINI_INTERACTION_FAILED'
          : 'GEMINI_INTERACTION_NOT_COMPLETED',
      providerStatus: null,
    };
  }
  if (error instanceof GeminiTranscriptionScriptError) {
    return {
      providerFailureReason: 'GEMINI_UNSUPPORTED_SCRIPT',
      providerStatus: null,
    };
  }
  if (error instanceof CreatorTranscriptionResponseError) {
    return {
      providerFailureReason: `GEMINI_${error.reason}`,
      providerStatus: null,
    };
  }
  if (
    error instanceof Error &&
    (error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('fetch'))
  ) {
    return {
      providerFailureReason: 'GEMINI_CONNECTION_ERROR',
      providerStatus: null,
    };
  }
  return {
    providerFailureReason: 'GEMINI_LOCAL_PROCESSING_ERROR',
    providerStatus: null,
  };
}

/**
 * Transcribes an audio file using Google's gemini-3.5-transcribe model.
 *
 * Steps:
 *  1. Upload the audio file via the Files API to obtain a stable URI.
 *  2. Request the model's native word timestamps and group them into segments.
 *  3. Validate with the shared parser; downstream language guards still apply.
 *  4. Delete the uploaded file to avoid Files API storage accumulation.
 *
 * Errors are classified and logged here (without private content), then
 * normalised into CreatorProviderError for the worker's refund path.
 */
export async function transcribeWithGemini(
  apiKey: string,
  model: string,
  audioPath: string,
  mimeType: string,
  durationSeconds: number,
  language: CreatorLanguage,
  usdPerMinute: number,
): Promise<CreatorGatewayResult<CreatorTranscript>> {
  const startedAt = Date.now();
  const client = new GoogleGenAI({ apiKey });
  let uploadedFileName: string | undefined;
  let uploadCompleted = false;
  let interactionCompleted = false;
  let responseDiagnostics:
    ReturnType<typeof interactionDiagnostics> | undefined;
  let providerUsage:
    CreatorGatewayResult<CreatorTranscript>['usage'] | undefined;

  try {
    // Step 1: Upload audio. The Files API stores it server-side so we can
    // reference it by URI without inlining potentially large base64 blobs.
    const uploaded = await client.files.upload({
      file: audioPath,
      config: { mimeType },
    });
    uploadedFileName = uploaded.name;
    uploadCompleted = true;

    if (!uploaded.uri) {
      throw new Error('Files API returned no URI for the uploaded audio');
    }

    // Step 2: Request native word annotations; this model returns transcript
    // text and timings separately rather than a JSON segment response.
    const code = languageCode(language);
    const interaction = await client.interactions.create({
      model,
      input: [
        {
          type: 'audio',
          uri: uploaded.uri,
          mime_type: mimeType,
        },
      ],
      generation_config: {
        // verbatim preserves timing accuracy; smart mode cleans disfluencies
        // but can shift word boundaries and affect timestamp precision.
        transcription_config: {
          mode: { type: 'verbatim', timestamp_granularities: ['word'] },
          ...(code ? { language_codes: [code] } : {}),
        },
      },
    });
    responseDiagnostics = interactionDiagnostics(interaction);
    interactionCompleted = interaction.status === 'completed';

    const durationMs = Date.now() - startedAt;
    // A returned interaction can incur provider cost even if its output fails
    // validation, so retain usage for the worker's refund/accounting path.
    providerUsage = {
      provider: 'GEMINI',
      model,
      inputTokens: null,
      cachedInputTokens: null,
      outputTokens: null,
      audioSeconds: Math.ceil(durationSeconds),
      estimatedProviderCostUsd: (durationSeconds / 60) * usdPerMinute,
      providerRequestId: interaction.id ?? uploadedFileName ?? null,
      durationMs,
    };
    if (!interactionCompleted) {
      throw new GeminiInteractionStatusError(interaction.status);
    }
    const data = transcriptFromInteraction(interaction);
    return {
      data,
      usage: providerUsage,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const { providerFailureReason, providerStatus } =
      classifyGeminiError(error);
    // Log diagnostics without exposing raw error messages (which could echo
    // transcript content, audio paths, or API key fragments).
    logger.error('Gemini transcription request failed', {
      model,
      language,
      durationMs,
      uploadCompleted,
      interactionCompleted,
      providerStatus,
      providerFailureReason,
      ...responseDiagnostics,
    });
    throw new CreatorProviderError(
      'Gemini transcription failed',
      durationMs,
      providerUsage ? { ...providerUsage, durationMs } : undefined,
    );
  } finally {
    // Always clean up the uploaded file — we never need it after the
    // interaction completes, and it would otherwise auto-expire after 48 h.
    if (uploadedFileName) {
      await client.files.delete({ name: uploadedFileName }).catch(() => {
        // Non-fatal: the file auto-expires. Log nothing — the path is private.
      });
    }
  }
}
