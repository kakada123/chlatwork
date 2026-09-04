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

  return config;
}
