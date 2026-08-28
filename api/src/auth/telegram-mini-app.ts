import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export type TelegramMiniAppDataErrorCode =
  | 'invalid_data'
  | 'invalid_signature'
  | 'expired'
  | 'invalid_user';

export class TelegramMiniAppDataError extends Error {
  constructor(readonly code: TelegramMiniAppDataErrorCode) {
    super(code);
  }
}

export interface TelegramMiniAppProfile {
  providerUserId: string;
  name: string | null;
  avatarUrl: string | null;
}

export function verifyTelegramMiniAppData(
  initData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS,
): TelegramMiniAppProfile {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash') ?? '';
  const authDate = Number(params.get('auth_date'));
  const userJson = params.get('user');
  if (!/^[a-f0-9]{64}$/i.test(receivedHash) || !Number.isSafeInteger(authDate) || !userJson) {
    throw new TelegramMiniAppDataError('invalid_data');
  }

  const dataCheckString = [...params.entries()]
    // Bot-token validation covers every received field except the comparison hash itself.
    .filter(([key]) => key !== 'hash')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(dataCheckString).digest();
  const suppliedHash = Buffer.from(receivedHash, 'hex');
  if (suppliedHash.length !== expectedHash.length || !timingSafeEqual(suppliedHash, expectedHash)) {
    throw new TelegramMiniAppDataError('invalid_signature');
  }
  if (authDate > nowSeconds + 30 || nowSeconds - authDate > maxAgeSeconds) {
    throw new TelegramMiniAppDataError('expired');
  }

  let telegramUser: Record<string, unknown>;
  try {
    telegramUser = JSON.parse(userJson) as Record<string, unknown>;
  } catch {
    throw new TelegramMiniAppDataError('invalid_user');
  }
  const id = telegramUser.id;
  if ((typeof id !== 'number' && typeof id !== 'string') || !/^\d+$/.test(String(id))) {
    throw new TelegramMiniAppDataError('invalid_user');
  }
  const firstName = boundedString(telegramUser.first_name, 256);
  const lastName = boundedString(telegramUser.last_name, 256);
  const username = boundedString(telegramUser.username, 256);

  return {
    providerUserId: String(id),
    name: [firstName, lastName].filter(Boolean).join(' ') || username,
    avatarUrl: boundedString(telegramUser.photo_url, 2048),
  };
}

function boundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}
