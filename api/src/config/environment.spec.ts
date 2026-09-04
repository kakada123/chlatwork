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
  it('accepts complete configuration', () => {
    expect(validateEnvironment({ ...valid })).toEqual(valid);
  });

  it('rejects missing provider configuration', () => {
    expect(() => validateEnvironment({ ...valid, GOOGLE_CLIENT_ID: '' })).toThrow(
      'GOOGLE_CLIENT_ID is required',
    );
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
