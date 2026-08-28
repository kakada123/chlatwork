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
    expect(() => verifyTelegramMiniAppData(signedInitData(), BOT_TOKEN, NOW + 86_401)).toThrow('expired');
  });

  it('accepts Telegram Mini Apps current signature-bearing fixture', () => {
    const initData = 'user=%7B%22id%22%3A279058397%2C%22first_name%22%3A%22Vladislav%20%2B%20-%20%3F%20%5C%2F%22%2C%22last_name%22%3A%22Kibenko%22%2C%22username%22%3A%22vdkfrost%22%2C%22language_code%22%3A%22ru%22%2C%22is_premium%22%3Atrue%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2F4FPEE4tmP3ATHa57u6MqTDih13LTOiMoKoLDRG4PnSA.svg%22%7D&chat_instance=8134722200314281151&chat_type=private&auth_date=1733509682&signature=TYJxVcisqbWjtodPepiJ6ghziUL94-KNpG8Pau-X7oNNLNBM72APCpi_RKiUlBvcqo5L-LAxIc3dnTzcZX_PDg&hash=a433d8f9847bd6addcc563bff7cc82c89e97ea0d90c11fe5729cae6796a36d73';
    const token = '7342037359:AAHI25ES9xCOMPokpYoz-p8XVrZUdygo2J4';

    expect(verifyTelegramMiniAppData(initData, token, 1_733_509_682)).toMatchObject({
      providerUserId: '279058397',
      name: 'Vladislav + - ? / Kibenko',
    });
  });
});
