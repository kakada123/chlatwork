import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthProvider, UserRole, type User } from '@prisma/client';
import { AuthService } from './auth.service';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

const user: User = {
  id: '4e4f663a-44da-439c-a08e-fc3a41bb0054',
  email: 'person@example.com',
  phone: null,
  name: 'Test Person',
  avatarUrl: null,
  role: UserRole.USER,
  isActive: true,
  telegramNotificationsEnabled: false,
  telegramNotificationsEnabledAt: null,
  telegramNotificationTimeZone: 'Asia/Phnom_Penh',
  telegramDailyExpenseSummaryHour: 22,
  telegramDailyExpenseSummaryLastAttemptDate: null,
  telegramBudgetAlertsEnabled: false,
  telegramWeeklyDigestEnabled: false,
  telegramWeeklyDigestHour: 20,
  telegramWeeklyDigestLastAttemptDate: null,
  createdAt: new Date('2026-08-21T00:00:00.000Z'),
  updatedAt: new Date('2026-08-21T00:00:00.000Z'),
};

function createService() {
  const refreshToken = {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const socialAccount = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const userModel = { findUnique: jest.fn() };
  const prisma = {
    refreshToken,
    socialAccount,
    user: userModel,
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (work) => work(prisma));
  const jwt = { signAsync: jest.fn().mockResolvedValue('new-access-token') };
  const service = new AuthService({} as never, jwt as never, prisma as never);

  return { service, refreshToken, socialAccount, userModel, prisma };
}

function storedToken(revokedAt: Date | null) {
  return {
    id: '0094d419-2e05-4d91-a43f-5079638cf503',
    tokenHash: 'stored-hash',
    userId: user.id,
    user,
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt,
    createdAt: new Date(),
  };
}

describe('AuthService refresh rotation', () => {
  it('allows a parallel refresh that arrives during the rotation grace period', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(new Date(Date.now() - 1_000)));

    const result = await service.refresh('same-browser-refresh-token');

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('rejects reuse after the rotation grace period', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(new Date(Date.now() - 11_000)));

    await expect(service.refresh('reused-refresh-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshToken.create).not.toHaveBeenCalled();
  });

  it('does not fail when another request wins the atomic revocation race', async () => {
    const { service, refreshToken } = createService();
    refreshToken.findUnique.mockResolvedValue(storedToken(null));
    refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh('parallel-refresh-token')).resolves.toMatchObject({
      accessToken: 'new-access-token',
    });
  });

  it('deletes the presented token on explicit logout so rotation grace cannot revive it', async () => {
    const { service, refreshToken } = createService();

    await service.logout('logout-refresh-token');

    expect(refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    expect(refreshToken.updateMany).not.toHaveBeenCalled();
  });
});

describe('AuthService Telegram identity compatibility', () => {
  const telegramProfile = {
    provider: AuthProvider.TELEGRAM,
    providerUserId: '987654321',
    legacyProviderUserId: '1234123412341234123',
    email: null,
    name: 'Test Person',
    avatarUrl: null,
  };

  function authenticateProvider(service: AuthService) {
    return (
      service as unknown as {
        authenticateProvider(profile: typeof telegramProfile): Promise<unknown>;
      }
    ).authenticateProvider(telegramProfile);
  }

  it('migrates an existing web Telegram account to the Mini App user ID', async () => {
    const { service, socialAccount } = createService();
    const legacyAccount = {
      id: 'b064e447-574d-411e-b53a-d56672822409',
      provider: AuthProvider.TELEGRAM,
      providerUserId: telegramProfile.legacyProviderUserId,
      providerEmail: null,
      userId: user.id,
      user,
    };
    socialAccount.findMany.mockResolvedValueOnce([legacyAccount]).mockResolvedValueOnce([{ provider: AuthProvider.TELEGRAM }]);
    socialAccount.update.mockResolvedValue({
      ...legacyAccount,
      providerUserId: telegramProfile.providerUserId,
    });

    await expect(authenticateProvider(service)).resolves.toMatchObject({
      user: { id: user.id },
    });
    expect(socialAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: legacyAccount.id },
        data: { providerUserId: telegramProfile.providerUserId },
      }),
    );
  });

  it('requires a reviewed merge when Telegram identifiers belong to different users', async () => {
    const { service, socialAccount } = createService();
    const temporaryUser = { ...user, id: 'f64300df-0f20-49d6-8fa0-e8f68ccaa470' };
    socialAccount.findMany.mockResolvedValue([
      {
        id: '7027bfdb-01d0-412b-a243-14dfc4b4c91a',
        providerUserId: telegramProfile.providerUserId,
        userId: temporaryUser.id,
        user: temporaryUser,
      },
      {
        id: '0a5fa027-e46d-4630-89d0-753af994b336',
        providerUserId: telegramProfile.legacyProviderUserId,
        userId: user.id,
        user,
      },
    ]);

    await expect(authenticateProvider(service)).rejects.toBeInstanceOf(ConflictException);
    expect(socialAccount.update).not.toHaveBeenCalled();
  });
});
