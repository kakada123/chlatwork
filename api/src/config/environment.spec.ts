import { validateEnvironment } from './environment';

const valid = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/chlatwork',
  FRONTEND_ORIGIN: 'http://localhost:3001',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  GOOGLE_CLIENT_ID: 'google-client',
  GOOGLE_CLIENT_SECRET: 'google-secret',
  TELEGRAM_BOT_TOKEN: '123456789:test-token',
  TELEGRAM_WEBHOOK_SECRET: 'dummy_webhook_secret_1234',
  TELEGRAM_CLIENT_ID: 'telegram-client',
  TELEGRAM_CLIENT_SECRET: 'telegram-secret',
};

describe('validateEnvironment', () => {
  it('accepts moderate warning thresholds while keeping deletion thresholds at 90 or higher', () => {
    const warnings = {
      TELEGRAM_BUSINESS_SECURITY_WARNING_RISK_THRESHOLD: '50',
      TELEGRAM_BUSINESS_SECURITY_WARNING_CONFIDENCE_THRESHOLD: '60',
    };
    expect(validateEnvironment({ ...valid, ...warnings })).toMatchObject(
      warnings,
    );
    for (const key of Object.keys(warnings)) {
      for (const value of ['0', '101', '50.5', 'invalid'])
        expect(() => validateEnvironment({ ...valid, [key]: value })).toThrow(
          key,
        );
    }
    expect(() =>
      validateEnvironment({
        ...valid,
        ...warnings,
        TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '50',
      }),
    ).toThrow('TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD');
    expect(() =>
      validateEnvironment({
        ...valid,
        ...warnings,
        TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD: '60',
      }),
    ).toThrow('TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD');
  });
  it('allows reputation scanning without AI and validates its opt-in, key, and limits', () => {
    const scanner = {
      TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
      TELEGRAM_BUSINESS_URL_SCAN_ENABLED: 'true',
      WEBRISK_API_KEY: 'test-provider-key',
    };
    expect(validateEnvironment({ ...valid, ...scanner })).toMatchObject(
      scanner,
    );
    for (const override of [
      { TELEGRAM_BUSINESS_URL_SCAN_ENABLED: 'yes' },
      { TELEGRAM_BUSINESS_SECURITY_ENABLED: 'false' },
      { WEBRISK_API_KEY: '' },
      { WEBRISK_API_KEY: 'invalid key' },
      { WEBRISK_API_KEY: 'dummy_webrisk_api_key' },
      { WEBRISK_TIMEOUT_MS: '999' },
      { WEBRISK_TIMEOUT_MS: '10001' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_LINKS: '0' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_LINKS: '11' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_CONCURRENT: '0' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_CONCURRENT: '5' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_REQUESTS_PER_MINUTE: '0' },
      { TELEGRAM_BUSINESS_URL_SCAN_MAX_REQUESTS_PER_MINUTE: '301' },
    ])
      expect(() =>
        validateEnvironment({ ...valid, ...scanner, ...override }),
      ).toThrow();
  });
  const fileScanner = {
    TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
    TELEGRAM_BUSINESS_FILE_SCAN_ENABLED: 'true',
    CLAMAV_HOST: 'clamav.railway.internal',
  };

  it('allows file scanning without an AI provider and validates private endpoint/limits', () => {
    expect(validateEnvironment({ ...valid, ...fileScanner })).toMatchObject(
      fileScanner,
    );
    for (const host of [
      'localhost',
      '127.0.0.1',
      '10.0.0.2',
      '172.16.1.2',
      '192.168.1.2',
      '::1',
      'fd00::2',
    ]) {
      expect(() =>
        validateEnvironment({ ...valid, ...fileScanner, CLAMAV_HOST: host }),
      ).not.toThrow();
    }
    for (const override of [
      { TELEGRAM_BUSINESS_FILE_SCAN_ENABLED: 'yes' },
      { TELEGRAM_BUSINESS_SECURITY_ENABLED: 'false' },
      { CLAMAV_HOST: '' },
      { CLAMAV_HOST: 'example.com' },
      { CLAMAV_HOST: 'https://clamav.railway.internal' },
      { CLAMAV_HOST: 'clamav.railway.internal.attacker.com' },
      { CLAMAV_HOST: '8.8.8.8' },
      { CLAMAV_PORT: '0' },
      { CLAMAV_PORT: '65536' },
      { CLAMAV_TIMEOUT_MS: '999' },
      { CLAMAV_TIMEOUT_MS: '30001' },
      { TELEGRAM_BUSINESS_FILE_SCAN_MAX_BYTES: '0' },
      { TELEGRAM_BUSINESS_FILE_SCAN_MAX_BYTES: String(20 * 1024 * 1024 + 1) },
      { TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT: '0' },
      { TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT: '5' },
      { TELEGRAM_BUSINESS_FILE_SCAN_MAX_CONCURRENT: '1.5' },
    ])
      expect(() =>
        validateEnvironment({ ...valid, ...fileScanner, ...override }),
      ).toThrow();
  });

  it('validates Business security opt-in and deletion thresholds', () => {
    expect(
      validateEnvironment({
        ...valid,
        OPENAI_API_KEY: 'test-provider-key',
        TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
        TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'true',
        TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '90',
        TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD: '95',
        TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE: '60',
      }),
    ).toMatchObject({ TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'true' });
    for (const settings of [
      { TELEGRAM_BUSINESS_SECURITY_ENABLED: 'sometimes' },
      { TELEGRAM_BUSINESS_SECURITY_OWNER_ALERTS: 'sometimes' },
      { TELEGRAM_BUSINESS_SECURITY_CHAT_ALERTS: 'sometimes' },
      { TELEGRAM_BUSINESS_SECURITY_AUTO_DELETE: 'true' },
      { TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '89' },
      { TELEGRAM_BUSINESS_SECURITY_RISK_THRESHOLD: '101' },
      { TELEGRAM_BUSINESS_SECURITY_CONFIDENCE_THRESHOLD: '90.5' },
      { TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE: '0' },
      { TELEGRAM_BUSINESS_SECURITY_MAX_SCANS_PER_MINUTE: '301' },
      {
        TELEGRAM_BUSINESS_SECURITY_ENABLED: 'true',
        OPENAI_API_KEY: 'dummy_openai_key',
      },
    ])
      expect(() => validateEnvironment({ ...valid, ...settings })).toThrow();
  });

  it('accepts an optional separate Creator bot and rejects partial or shared configuration', () => {
    const creator = {
      CREATOR_TELEGRAM_BOT_TOKEN: '987654321:creator-test-token',
      CREATOR_TELEGRAM_WEBHOOK_SECRET: 'creator_test_webhook_1234',
    };
    expect(validateEnvironment({ ...valid, ...creator })).toMatchObject(
      creator,
    );
    for (const override of [
      { CREATOR_TELEGRAM_BOT_TOKEN: '' },
      { CREATOR_TELEGRAM_WEBHOOK_SECRET: '' },
      { CREATOR_TELEGRAM_BOT_TOKEN: valid.TELEGRAM_BOT_TOKEN },
      { CREATOR_TELEGRAM_WEBHOOK_SECRET: valid.TELEGRAM_WEBHOOK_SECRET },
      { CREATOR_TELEGRAM_BOT_TOKEN: ' malformed ' },
      { NODE_ENV: 'production' },
    ])
      expect(() =>
        validateEnvironment({ ...valid, ...creator, ...override }),
      ).toThrow();
  });
  it('accepts complete configuration', () => {
    expect(validateEnvironment({ ...valid })).toEqual(valid);
  });

  it('keeps Creator AI safely disabled without provider configuration', () => {
    expect(validateEnvironment({ ...valid, AI_ENABLED: 'false' })).toEqual({
      ...valid,
      AI_ENABLED: 'false',
    });
  });

  it('requires provider and budget safeguards when Creator AI is enabled', () => {
    expect(() => validateEnvironment({ ...valid, AI_ENABLED: 'true' })).toThrow(
      'OPENAI_API_KEY is required',
    );
  });

  it('selects Gemini without requiring OpenAI credit or credentials', () => {
    const config = {
      ...valid,
      AI_ENABLED: 'true',
      AI_USE_GEMINI: 'true',
      GEMINI_API_KEY: 'test-gemini-key',
      AI_DAILY_PROVIDER_BUDGET_USD: '1',
      AI_MONTHLY_PROVIDER_BUDGET_USD: '10',
    };
    expect(validateEnvironment(config)).toEqual(config);
    expect(() =>
      validateEnvironment({ ...config, GEMINI_API_KEY: 'dummy_gemini_key' }),
    ).toThrow('GEMINI_API_KEY is required');
  });

  it('rejects invalid provider switches and unpriced custom Gemini models', () => {
    expect(() =>
      validateEnvironment({ ...valid, AI_USE_GEMINI: 'sometimes' }),
    ).toThrow('AI_USE_GEMINI must be true or false');
    expect(() =>
      validateEnvironment({
        ...valid,
        AI_USE_GEMINI: 'true',
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_TEXT_MODEL: 'custom-model',
      }),
    ).toThrow('GEMINI_TEXT_INPUT_USD_PER_1M is required');
  });

  it('accepts Railway public domain without duplicate Creator URL configuration', () => {
    const config = {
      ...valid,
      NODE_ENV: 'production',
      RAILWAY_PUBLIC_DOMAIN: 'creator-api.example.com',
      AI_ENABLED: 'true',
      OPENAI_API_KEY: 'test-api-key',
      OPENAI_TEXT_MODEL: 'test-text-model',
      OPENAI_TRANSCRIPTION_MODEL: 'test-transcription-model',
      AI_DAILY_PROVIDER_BUDGET_USD: '1',
      AI_MONTHLY_PROVIDER_BUDGET_USD: '10',
    };

    expect(validateEnvironment(config)).toEqual(config);
  });

  it('rejects missing provider configuration', () => {
    expect(() =>
      validateEnvironment({ ...valid, GOOGLE_CLIENT_ID: '' }),
    ).toThrow('GOOGLE_CLIENT_ID is required');
  });

  it('rejects weak JWT secrets', () => {
    expect(() =>
      validateEnvironment({ ...valid, JWT_ACCESS_SECRET: 'short' }),
    ).toThrow('at least 32');
  });

  it('rejects unsafe Telegram webhook secrets', () => {
    expect(() =>
      validateEnvironment({ ...valid, TELEGRAM_WEBHOOK_SECRET: 'too short' }),
    ).toThrow('TELEGRAM_WEBHOOK_SECRET');
  });
});
