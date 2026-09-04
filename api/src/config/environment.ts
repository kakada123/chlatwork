const REQUIRED = [
  'DATABASE_URL',
  'FRONTEND_ORIGIN',
  'JWT_ACCESS_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_WEBHOOK_SECRET',
  'TELEGRAM_CLIENT_ID',
  'TELEGRAM_CLIENT_SECRET',
] as const;

const OPTIONAL_NUMBERS = [
  'AI_INITIAL_CREDITS',
  'AI_FREE_RATE_LIMIT_PER_MINUTE',
  'AI_FREE_RATE_LIMIT_PER_HOUR',
  'AI_FREE_DAILY_CREDIT_LIMIT',
  'AI_FREE_MAX_VIDEO_MINUTES',
  'AI_FREE_MAX_VIDEO_BYTES',
  'AI_FREE_MAX_CONCURRENT_VIDEO_JOBS',
  'AI_PROVIDER_ESTIMATED_USD_PER_CREDIT',
  'AI_DAILY_PROVIDER_BUDGET_USD',
  'AI_MONTHLY_PROVIDER_BUDGET_USD',
  'AI_PROVIDER_TIMEOUT_MS',
  'AI_VIDEO_WORKER_POLL_MS',
  'AI_VIDEO_STALE_MINUTES',
  'AI_GENERATION_RETENTION_DAYS',
  'AI_CREDIT_PRICE_POST',
  'AI_CREDIT_PRICE_SCRIPT',
  'AI_CREDIT_PRICE_HOOK',
  'AI_CREDIT_PRICE_CONTENT_IDEAS',
  'AI_CREDIT_PRICE_KHMER_GRAMMAR',
  'AI_CREDIT_PRICE_KHMER_REWRITE',
  'AI_CREDIT_PRICE_LATIN_TO_KHMER',
  'AI_CREDIT_PRICE_HUMANIZE',
  'AI_CREDIT_PRICE_FACEBOOK_TO_TIKTOK',
  'AI_CREDIT_PRICE_LONG_TO_SHORT',
  'AI_CREDIT_PRICE_VIDEO_CAPTION_PER_MINUTE',
  'AI_CREDIT_PRICE_VIDEO_SUMMARY_PER_MINUTE',
  'AI_CREDIT_PRICE_VIDEO_TO_SOCIAL_PER_MINUTE',
  'AI_CREDIT_PRICE_VIDEO_SUBTITLE_PER_MINUTE',
  'AI_CREDIT_PRICE_VIDEO_CONTENT_PACK_PER_MINUTE',
  'OPENAI_TEXT_INPUT_USD_PER_1M',
  'OPENAI_TEXT_OUTPUT_USD_PER_1M',
  'OPENAI_PREMIUM_INPUT_USD_PER_1M',
  'OPENAI_PREMIUM_OUTPUT_USD_PER_1M',
  'OPENAI_TRANSCRIPTION_USD_PER_MINUTE',
] as const;

export function validateEnvironment(config: Record<string, unknown>) {
  for (const key of REQUIRED) {
    if (typeof config[key] !== 'string' || !config[key]) {
      throw new Error(`${key} is required`);
    }
  }

  if ((config.JWT_ACCESS_SECRET as string).length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters');
  }

  if (!/^[A-Za-z0-9_-]{16,256}$/.test(config.TELEGRAM_WEBHOOK_SECRET as string)) {
    throw new Error(
      'TELEGRAM_WEBHOOK_SECRET must contain 16-256 letters, numbers, underscores, or hyphens',
    );
  }

  for (const key of ['DATABASE_URL', 'FRONTEND_ORIGIN'] as const) {
    try {
      new URL(config[key] as string);
    } catch {
      throw new Error(`${key} must be a valid URL`);
    }
  }

  if (
    config.AI_ENABLED !== undefined &&
    !['true', 'false'].includes(String(config.AI_ENABLED).toLowerCase())
  ) {
    throw new Error('AI_ENABLED must be true or false');
  }

  for (const key of OPTIONAL_NUMBERS) {
    const value = config[key];
    if (value === undefined || value === '') continue;
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
  }

  if (String(config.AI_ENABLED).toLowerCase() === 'true') {
    for (const key of [
      'OPENAI_API_KEY',
      'OPENAI_TEXT_MODEL',
      'OPENAI_TRANSCRIPTION_MODEL',
      'AI_DAILY_PROVIDER_BUDGET_USD',
      'AI_MONTHLY_PROVIDER_BUDGET_USD',
    ] as const) {
      const value = String(config[key] ?? '').trim();
      if (!value || /^(dummy_|replace_)/i.test(value)) {
        throw new Error(`${key} is required when AI_ENABLED=true`);
      }
    }

    if (
      String(config.NODE_ENV).toLowerCase() === 'production' &&
      !String(config.RAILWAY_PUBLIC_DOMAIN ?? '').trim() &&
      !String(config.CREATOR_PUBLIC_API_BASE_URL ?? '').trim()
    ) {
      throw new Error(
        'RAILWAY_PUBLIC_DOMAIN or CREATOR_PUBLIC_API_BASE_URL is required for production video uploads',
      );
    }
  }

  const creatorPublicApiBaseUrl = String(
    config.CREATOR_PUBLIC_API_BASE_URL ?? '',
  ).trim();
  if (creatorPublicApiBaseUrl) {
    try {
      new URL(creatorPublicApiBaseUrl);
    } catch {
      throw new Error('CREATOR_PUBLIC_API_BASE_URL must be a valid URL');
    }
  }

  return config;
}
