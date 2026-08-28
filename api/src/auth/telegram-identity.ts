import type { JWTPayload } from 'jose';

export interface TelegramOidcIdentity {
  providerUserId: string;
  legacyProviderUserId: string | null;
}

export function getTelegramOidcIdentity(payload: JWTPayload): TelegramOidcIdentity {
  const subject = typeof payload.sub === 'string' && payload.sub.length <= 256 ? payload.sub : null;
  const rawUserId = payload.id;
  const providerUserId =
    (typeof rawUserId === 'number' && Number.isSafeInteger(rawUserId) && rawUserId > 0) || (typeof rawUserId === 'string' && /^\d+$/.test(rawUserId))
      ? String(rawUserId)
      : null;

  if (!subject || !providerUserId) {
    throw new Error('Telegram OIDC token is missing its user identity');
  }

  return {
    // Mini App initData exposes this same Telegram user ID, while OIDC `sub` is a different identifier.
    providerUserId,
    legacyProviderUserId: subject === providerUserId ? null : subject,
  };
}
