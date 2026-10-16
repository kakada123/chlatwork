import { BotAccessService, botAccessAllowed } from './bot-access.service';

describe('shared bot access', () => {
  it('requires approval, an enabled bot and an active website account', () => {
    expect(
      botAccessAllowed({ status: 'APPROVED', enabled: true, isActive: true }),
    ).toBe(true);
    for (const status of ['PENDING', 'REJECTED', 'SUSPENDED'] as const) {
      expect(botAccessAllowed({ status, enabled: true, isActive: true })).toBe(
        false,
      );
    }
    expect(
      botAccessAllowed({ status: 'APPROVED', enabled: false, isActive: true }),
    ).toBe(false);
    expect(
      botAccessAllowed({ status: 'APPROVED', enabled: true, isActive: false }),
    ).toBe(false);
    expect(botAccessAllowed(null)).toBe(false);
  });

  it('never registers a group observation or an invalid sender', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = new BotAccessService(prisma as never);
    await expect(
      service.register('CREATOR', { id: -10 }, false),
    ).rejects.toThrow();
    await expect(
      service.register('CHLATWORK', { id: 123 }, false),
    ).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('denies access when a registered profile is missing instead of approving it lazily', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const service = new BotAccessService(prisma as never);
    expect(await service.allowed('CREATOR', 'user')).toBe(false);
  });
});

describe('private registration identity reuse', () => {
  it('creates one numeric Telegram identity across repeated starts in both bots', async () => {
    let linked: { userId: string } | null = null;
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ userId: 'owner' }]),
      socialAccount: { findUnique: jest.fn(async () => linked) },
      user: {
        create: jest.fn(async () => {
          linked = { userId: 'owner' };
          return { id: 'owner' };
        }),
      },
    };
    const prisma = {
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const service = new BotAccessService(prisma as never);
    await expect(
      service.register(
        'CREATOR',
        { id: 123, first_name: 'User', username: 'someone' },
        true,
      ),
    ).resolves.toBe('owner');
    await expect(
      service.register('CHLATWORK', { id: 123, first_name: 'Renamed' }, true),
    ).resolves.toBe('owner');
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    expect(tx.user.create.mock.calls[0]).toEqual([
      {
        data: {
          name: 'User',
          socialAccounts: {
            create: { provider: 'TELEGRAM', providerUserId: '123' },
          },
        },
        select: { id: true },
      },
    ]);
  });
});
