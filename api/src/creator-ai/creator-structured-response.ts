import type { Response } from 'openai/resources/responses/responses';
import type { CreatorPromptSpec } from './creator-prompts';
import { CreatorResultValidationError } from './creator-result-validation';

export class CreatorStructuredResponseError extends Error {
  constructor(
    readonly reason:
      | 'OUTPUT_TOKEN_LIMIT'
      | 'CONTENT_FILTERED'
      | 'RESPONSE_NOT_COMPLETED'
      | 'MODEL_REFUSAL'
      | 'EMPTY_OUTPUT'
      | 'INVALID_JSON'
      | 'RESULT_VALIDATION_FAILED',
    readonly validation?: CreatorResultValidationError,
  ) {
    super('Creator structured response was not usable');
  }
}

export function parseCreatorStructuredResponse<T>(
  response: Response,
  spec: CreatorPromptSpec<T>,
): T {
  // Even valid-looking JSON is unsafe to finalize when the response was cut off.
  if (response.status !== 'completed') {
    throw new CreatorStructuredResponseError(
      response.incomplete_details?.reason === 'max_output_tokens'
        ? 'OUTPUT_TOKEN_LIMIT'
        : response.incomplete_details?.reason === 'content_filter'
          ? 'CONTENT_FILTERED'
          : 'RESPONSE_NOT_COMPLETED',
    );
  }
  if (
    response.output?.some(
      (item) =>
        item.type === 'message' &&
        item.content.some((part) => part.type === 'refusal'),
    )
  ) {
    throw new CreatorStructuredResponseError('MODEL_REFUSAL');
  }
  if (
    typeof response.output_text !== 'string' ||
    !response.output_text.trim()
  ) {
    throw new CreatorStructuredResponseError('EMPTY_OUTPUT');
  }
  let value: unknown;
  try {
    value = JSON.parse(response.output_text);
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

export function structuredResponseDiagnostics(response: Response | undefined) {
  const numeric = (value: unknown) =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? value
      : null;
  const states = new Set([
    'completed',
    'failed',
    'in_progress',
    'cancelled',
    'queued',
    'incomplete',
  ]);
  // Whitelisted metadata only: never include generated text, refusal text, or
  // parser messages, which may contain parts of the user's private transcript.
  return {
    responseStatus:
      response?.status && states.has(response.status) ? response.status : null,
    outputCharacters:
      typeof response?.output_text === 'string'
        ? response.output_text.length
        : null,
    inputTokens: numeric(response?.usage?.input_tokens),
    outputTokens: numeric(response?.usage?.output_tokens),
    reasoningTokens: numeric(
      response?.usage?.output_tokens_details?.reasoning_tokens,
    ),
  };
}
