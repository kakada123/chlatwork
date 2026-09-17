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
  'GEMINI_TRANSCRIPTION_USD_PER_MINUTE',
  'GEMINI_TEXT_INPUT_USD_PER_1M',
  'GEMINI_TEXT_OUTPUT_USD_PER_1M',
  'GEMINI_PREMIUM_INPUT_USD_PER_1M',
  'GEMINI_PREMIUM_OUTPUT_USD_PER_1M',
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

  if (
    !/^[A-Za-z0-9_-]{16,256}$/.test(config.TELEGRAM_WEBHOOK_SECRET as string)
  ) {
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

  const creatorBotToken = String(config.CREATOR_TELEGRAM_BOT_TOKEN ?? '');
  const creatorWebhookSecret = String(
    config.CREATOR_TELEGRAM_WEBHOOK_SECRET ?? '',
  );
  if (creatorBotToken || creatorWebhookSecret) {
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(creatorBotToken)) {
      throw new Error(
        'CREATOR_TELEGRAM_BOT_TOKEN is required for the Creator bot',
      );
    }
    if (!/^[A-Za-z0-9_-]{16,256}$/.test(creatorWebhookSecret)) {
      throw new Error(
        'CREATOR_TELEGRAM_WEBHOOK_SECRET must contain 16-256 letters, numbers, underscores, or hyphens',
      );
    }
    if (
      creatorBotToken === config.TELEGRAM_BOT_TOKEN ||
      creatorWebhookSecret === config.TELEGRAM_WEBHOOK_SECRET
    ) {
      throw new Error(
        'The Creator bot must use a separate bot token and webhook secret',
      );
    }
    if (
      String(config.NODE_ENV).toLowerCase() === 'production' &&
      new URL(String(config.FRONTEND_ORIGIN)).protocol !== 'https:'
    ) {
      throw new Error(
        'FRONTEND_ORIGIN must use HTTPS for the Creator bot Mini App',
      );
    }
  }

  for (const key of ['AI_ENABLED', 'AI_USE_GEMINI'] as const) {
    if (
      config[key] !== undefined &&
      !['true', 'false'].includes(String(config[key]).toLowerCase())
    ) {
      throw new Error(`${key} must be true or false`);
    }
  }

  const useGemini = String(config.AI_USE_GEMINI).toLowerCase() === 'true';
  if (useGemini) {
    const key = String(config.GEMINI_API_KEY ?? '').trim();
    if (!key || /^(dummy_|replace_)/i.test(key)) {
      throw new Error('GEMINI_API_KEY is required when AI_USE_GEMINI=true');
    }
  }

  for (const key of OPTIONAL_NUMBERS) {
    const value = config[key];
    if (value === undefined || value === '') continue;
    if (!Number.isFinite(Number(value)) || Number(value) < 0) {
      throw new Error(`${key} must be a non-negative number`);
    }
  }

  if (useGemini) {
    const rateKeys = [
      'GEMINI_TEXT_INPUT_USD_PER_1M',
      'GEMINI_TEXT_OUTPUT_USD_PER_1M',
      'GEMINI_PREMIUM_INPUT_USD_PER_1M',
      'GEMINI_PREMIUM_OUTPUT_USD_PER_1M',
      'GEMINI_TRANSCRIPTION_USD_PER_MINUTE',
    ] as const;
    for (const key of rateKeys) {
      if (config[key] !== undefined && Number(config[key]) <= 0) {
        throw new Error(`${key} must be positive when AI_USE_GEMINI=true`);
      }
    }
    const standardModel =
      String(config.GEMINI_TEXT_MODEL ?? '').trim() || 'gemini-2.5-flash';
    const premiumModel =
      String(config.GEMINI_PREMIUM_TEXT_MODEL ?? '').trim() || standardModel;
    const transcriptionModel =
      String(config.GEMINI_TRANSCRIPTION_MODEL ?? '').trim() ||
      'gemini-3.5-transcribe';
    const requiredRates = [
      ...(standardModel === 'gemini-2.5-flash'
        ? []
        : ['GEMINI_TEXT_INPUT_USD_PER_1M', 'GEMINI_TEXT_OUTPUT_USD_PER_1M']),
      ...(premiumModel === standardModel
        ? []
        : [
            'GEMINI_PREMIUM_INPUT_USD_PER_1M',
            'GEMINI_PREMIUM_OUTPUT_USD_PER_1M',
          ]),
      ...(transcriptionModel === 'gemini-3.5-transcribe'
        ? []
        : ['GEMINI_TRANSCRIPTION_USD_PER_MINUTE']),
    ];
    for (const key of requiredRates) {
      if (Number(config[key]) <= 0 || !Number.isFinite(Number(config[key]))) {
        throw new Error(`${key} is required for the selected Gemini model`);
      }
    }
  }

  if (String(config.AI_ENABLED).toLowerCase() === 'true') {
    for (const key of [
      ...(useGemini
        ? []
        : [
            'OPENAI_API_KEY',
            'OPENAI_TEXT_MODEL',
            'OPENAI_TRANSCRIPTION_MODEL',
          ]),
      'AI_DAILY_PROVIDER_BUDGET_USD',
      'AI_MONTHLY_PROVIDER_BUDGET_USD',
    ]) {
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
