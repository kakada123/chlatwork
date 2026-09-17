import { GoogleGenAI } from '@google/genai';
import type { CreatorLanguage } from './dto/creator-ai.dto';
import type { CreatorGatewayResult, CreatorTranscript } from './creator-ai.types';
import { CreatorProviderError } from './creator-ai-gateway.service';
import { parseCreatorTranscription } from './creator-transcription-response';

// BCP-47 language hint used by the transcription model to bias recognition
// toward the expected script. English uses auto-detection (no hint needed).
function languageCode(language: CreatorLanguage): string | undefined {
  if (language === 'ENGLISH') return undefined;
  // 'km' covers both KHMER and KHMER_ENGLISH — the model still preserves
  // embedded English terms when it hears them in Khmer speech.
  return 'km';
}

// System instruction steers the model toward the correct script and prevents
// it from substituting Thai characters for Khmer ones (a known Whisper issue).
function systemInstruction(language: CreatorLanguage): string {
  if (language === 'ENGLISH') {
    return 'Preserve the original spoken language, names, and product terms.';
  }
  return language === 'KHMER_ENGLISH'
    ? 'Audio is in Cambodian Khmer mixed naturally with English. Transcribe Khmer speech in Khmer script. Preserve English names and product terms as spoken. Never substitute Thai script.'
    : 'Audio is in Cambodian Khmer. Transcribe entirely in Khmer script. Preserve English product names and loanwords as spoken. Never substitute Thai script.';
}

// JSON schema for the segment-level transcript we request from the model.
// This maps directly to the existing TranscriptSegment type so no downstream
// code changes are needed.
const TRANSCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    text: { type: 'string', description: 'Full concatenated transcript text.' },
    segments: {
      type: 'array',
      description: 'Timestamped speech segments.',
      items: {
        type: 'object',
        properties: {
          start: { type: 'number', description: 'Segment start time in seconds.' },
          end: { type: 'number', description: 'Segment end time in seconds.' },
          text: { type: 'string', description: 'Segment transcript text.' },
        },
        required: ['start', 'end', 'text'],
      },
    },
  },
  required: ['text', 'segments'],
} as const;

/**
 * Transcribes an audio file using Google's gemini-3.5-transcribe model.
 *
 * Steps:
 *  1. Upload the audio file via the Files API to obtain a stable URI.
 *  2. Call interactions.create with a JSON responseSchema requesting
 *     timestamped segments — directly compatible with TranscriptSegment[].
 *  3. Parse with the shared parseCreatorTranscription() — all existing
 *     Thai-script and empty-transcript guards apply unchanged.
 *  4. Delete the uploaded file to avoid Files API storage accumulation.
 *
 * Errors are normalised into CreatorProviderError so the gateway's catch
 * block and existing refund / retry logic needs no changes.
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

  try {
    // Step 1: Upload audio. The Files API stores it server-side so we can
    // reference it by URI without inlining potentially large base64 blobs.
    const uploaded = await client.files.upload({
      file: audioPath,
      config: { mimeType },
    });
    uploadedFileName = uploaded.name;

    if (!uploaded.uri) {
      throw new Error('Files API returned no URI for the uploaded audio');
    }

    // Step 2: Transcribe with structured JSON output so we get timestamped
    // segments natively — no timestamp reconciliation required.
    const interaction = await client.interactions.create({
      model,
      system_instruction: systemInstruction(language),
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
          mode: 'verbatim',
          ...(languageCode(language) ? { language_codes: [languageCode(language)!] } : {}),
        },
      },
      response_format: [
        {
          type: 'text' as const,
          mime_type: 'application/json',
          schema: TRANSCRIPT_SCHEMA,
        },
      ],
    });

    // Parse the JSON output into the existing CreatorTranscript shape.
    const rawResponse = parseJsonResponse(interaction.output_text);
    const data = parseCreatorTranscription(rawResponse);

    const durationMs = Date.now() - startedAt;
    return {
      data,
      usage: {
        provider: 'GEMINI',
        model,
        inputTokens: null,
        cachedInputTokens: null,
        outputTokens: null,
        audioSeconds: Math.ceil(durationSeconds),
        estimatedProviderCostUsd: (durationSeconds / 60) * usdPerMinute,
        // Use the file name as a stable reference (analogous to providerRequestId).
        providerRequestId: uploadedFileName ?? null,
        durationMs,
      },
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    throw new CreatorProviderError(
      'Gemini transcription failed',
      durationMs,
      undefined,
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

/**
 * Parse the model's JSON string output into a plain object.
 * A markdown code fence is stripped first in case the model wraps its output.
 */
function parseJsonResponse(outputText: string | null | undefined): unknown {
  const text = typeof outputText === 'string' ? outputText.trim() : '';
  const stripped = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(stripped);
}
