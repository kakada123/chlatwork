import type { CreatorTranscript } from './creator-ai.types';

export class CreatorTranscriptionResponseError extends Error {
  constructor(
    readonly reason:
      | 'INVALID_TRANSCRIPTION_RESPONSE'
      | 'EMPTY_TRANSCRIPT'
      | 'MISSING_TIMESTAMPED_SEGMENTS'
      | 'INVALID_TRANSCRIPT_SEGMENTS',
  ) {
    super('Creator transcription response was not usable');
  }
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseCreatorTranscription(value: unknown): CreatorTranscript {
  const response = object(value);
  if (!response || typeof response.text !== 'string') {
    throw new CreatorTranscriptionResponseError(
      'INVALID_TRANSCRIPTION_RESPONSE',
    );
  }
  const text = response.text.trim();
  if (!text) throw new CreatorTranscriptionResponseError('EMPTY_TRANSCRIPT');
  if (
    response.segments == null ||
    (Array.isArray(response.segments) && !response.segments.length)
  ) {
    throw new CreatorTranscriptionResponseError('MISSING_TIMESTAMPED_SEGMENTS');
  }
  if (!Array.isArray(response.segments)) {
    throw new CreatorTranscriptionResponseError('INVALID_TRANSCRIPT_SEGMENTS');
  }
  // Never silently drop malformed segments: that would produce incomplete subtitles.
  const segments = response.segments.map((value) => {
    const segment = object(value);
    if (
      !segment ||
      typeof segment.start !== 'number' ||
      typeof segment.end !== 'number' ||
      !Number.isFinite(segment.start) ||
      !Number.isFinite(segment.end) ||
      segment.start < 0 ||
      segment.end <= segment.start ||
      typeof segment.text !== 'string' ||
      !segment.text.trim()
    ) {
      throw new CreatorTranscriptionResponseError(
        'INVALID_TRANSCRIPT_SEGMENTS',
      );
    }
    return {
      start: segment.start,
      end: segment.end,
      text: segment.text.trim(),
    };
  });
  return { text, segments };
}

export function transcriptionResponseDiagnostics(value: unknown) {
  const response = object(value);
  // Counts only; transcript text, audio paths, and provider messages stay private.
  return {
    transcriptCharacters:
      typeof response?.text === 'string' ? response.text.length : null,
    transcriptSegmentCount: Array.isArray(response?.segments)
      ? response.segments.length
      : null,
  };
}
