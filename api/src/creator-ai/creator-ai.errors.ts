import { HttpException, HttpStatus } from '@nestjs/common';

export type CreatorAiErrorCode =
  | 'INSUFFICIENT_AI_CREDITS'
  | 'AI_RATE_LIMITED'
  | 'AI_DAILY_LIMIT_REACHED'
  | 'AI_TEMPORARILY_UNAVAILABLE'
  | 'AI_GENERATION_FAILED'
  | 'AI_REQUEST_IN_PROGRESS'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'INVALID_VIDEO'
  | 'VIDEO_TOO_LARGE'
  | 'VIDEO_TOO_LONG'
  | 'UNSUPPORTED_VIDEO_FORMAT'
  | 'AI_JOB_NOT_FOUND';

export class CreatorAiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: CreatorAiErrorCode,
    message: string,
    details: Record<string, number | string | null> = {},
  ) {
    super({ statusCode: status, code, message, ...details }, status);
  }
}

export const creatorAiUnavailable = () =>
  new CreatorAiException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'AI_TEMPORARILY_UNAVAILABLE',
    'AI generation is temporarily unavailable. Please try again later.',
  );

export const creatorGenerationFailed = () =>
  new CreatorAiException(
    HttpStatus.BAD_GATEWAY,
    'AI_GENERATION_FAILED',
    'AI generation could not be completed. Your reserved credits were restored.',
  );
