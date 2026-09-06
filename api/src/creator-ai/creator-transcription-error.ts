const PARAMETERS = new Set([
  'language',
  'file',
  'model',
  'prompt',
  'response_format',
  'timestamp_granularities',
  'timestamp_granularities[]',
]);
const CODES = new Set([
  'unsupported_language',
  'unsupported_value',
  'invalid_value',
  'invalid_request_error',
  'invalid_audio',
  'invalid_file_format',
  'audio_too_short',
  'audio_too_long',
  'model_not_found',
  'rate_limit_exceeded',
  'insufficient_quota',
]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

export function transcriptionErrorDetails(error: unknown) {
  const top = record(error);
  const body = record(top.error);
  const status =
    typeof top.status === 'number' && Number.isInteger(top.status)
      ? top.status
      : null;
  const param = top.param ?? body.param;
  const code = top.code ?? body.code;
  const message =
    typeof body.message === 'string'
      ? body.message
      : typeof top.message === 'string'
        ? top.message
        : '';
  // Inspect provider wording only for classification. Never log raw messages,
  // which can echo filenames, prompts, credentials, or transcription content.
  const unsupportedLanguage =
    status === 400 &&
    (param == null || param === 'language') &&
    (code === 'unsupported_language' ||
      (param === 'language' && code === 'unsupported_value') ||
      (/\bkm\b/i.test(message) &&
        /\b(?:language(?: code)?\b.{0,80}\b(?:not supported|unsupported)|unsupported language(?: code)?\b)/i.test(
          message,
        )));
  const safeParam =
    typeof param === 'string' && PARAMETERS.has(param) ? param : null;
  const failureReason = unsupportedLanguage
    ? 'LANGUAGE_HINT_UNSUPPORTED'
    : safeParam === 'language'
      ? 'LANGUAGE_PARAMETER_REJECTED'
      : safeParam === 'file'
        ? 'AUDIO_FILE_REJECTED'
        : safeParam === 'prompt'
          ? 'PROMPT_REJECTED'
          : safeParam === 'model'
            ? 'MODEL_REJECTED'
            : safeParam === 'response_format' ||
                safeParam?.startsWith('timestamp_granularities')
              ? 'TRANSCRIPTION_FORMAT_REJECTED'
              : status === 400
                ? 'BAD_REQUEST_UNCLASSIFIED'
                : 'TRANSCRIPTION_REQUEST_FAILED';
  return {
    providerStatus: status,
    providerErrorCode:
      typeof code === 'string' && CODES.has(code) ? code : null,
    providerErrorParam: safeParam,
    providerFailureReason: failureReason,
  };
}
