import { createHmac } from 'node:crypto';
import { verifyTelegramMiniAppData } from './telegram-mini-app';

const BOT_TOKEN = '123456789:test-bot-token';
const NOW = 1_787_884_800;

function signedInitData(overrides: Record<string, string> = {}) {
  const values = {
    auth_date: String(NOW),
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    signature: 'telegram-ed25519-signature',
    user: JSON.stringify({ id: 123456789, first_name: 'Mini', last_name: 'User' }),
    ...overrides,
  };
  const dataCheckString = Object.entries(values)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...values, hash }).toString();
}

describe('verifyTelegramMiniAppData', () => {
  it('accepts fresh initData signed by the bot token', () => {
    expect(verifyTelegramMiniAppData(signedInitData(), BOT_TOKEN, NOW)).toEqual({
      providerUserId: '123456789',
      name: 'Mini User',
      avatarUrl: null,
    });
  });

  it('rejects tampering after Telegram signs the data', () => {
    expect(() => verifyTelegramMiniAppData(`${signedInitData()}&admin=true`, BOT_TOKEN, NOW)).toThrow(
      'signature',
    );
  });

  it('rejects stale initData', () => {
    expect(() => verifyTelegramMiniAppData(signedInitData(), BOT_TOKEN, NOW + 3601)).toThrow('Expired');
  });
});
