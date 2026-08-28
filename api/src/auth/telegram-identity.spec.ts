import { getTelegramOidcIdentity } from './telegram-identity';

describe('getTelegramOidcIdentity', () => {
  it('uses the Telegram user ID shared with Mini App initData', () => {
    expect(
      getTelegramOidcIdentity({
        sub: '1234123412341234123',
        id: 987654321,
      }),
    ).toEqual({
      providerUserId: '987654321',
      legacyProviderUserId: '1234123412341234123',
    });
  });

  it('accepts a digit-only string user ID without losing precision', () => {
    expect(
      getTelegramOidcIdentity({
        sub: 'telegram-subject',
        id: '9007199254740991',
      }),
    ).toMatchObject({
      providerUserId: '9007199254740991',
    });
  });

  it.each([{ sub: 'telegram-subject' }, { sub: 'telegram-subject', id: 'not-a-user-id' }, { id: 987654321 }])(
    'rejects incomplete or invalid Telegram identity claims',
    (payload) => {
      expect(() => getTelegramOidcIdentity(payload)).toThrow('missing its user identity');
    },
  );
});
