import { GroupAccessService } from './group-access.service';

const row = {
  workspaceId: '00000000-0000-4000-8000-000000000001',
  chatId: '-1001',
  title: 'Lunch',
  bot: 'CHLATWORK',
  workspaceVersion: 0,
  connectionVersion: 0,
  status: 'ACTIVE',
  enabled: true,
  health: 'CONNECTED',
  voting: true,
  split: true,
  khqr: true,
  creator: false,
};

function setup() {
  const prisma = { $queryRaw: jest.fn().mockResolvedValue([row]) };
  const bot = {
    getMe: jest.fn().mockResolvedValue({ id: 999, is_bot: true }),
    getChatMember: jest.fn(async (_chat: number, user: number) => ({
      user: { id: user },
      status: 'administrator',
    })),
  };
  const identities = {
    lookup: jest.fn().mockResolvedValue(null),
    identity: jest.fn().mockResolvedValue({
      telegramId: '123',
      status: 'APPROVED',
      enabled: true,
      isActive: true,
      hasMembership: true,
    }),
  };
  const service = new GroupAccessService(
    prisma as never,
    identities as never,
    bot as never,
    bot as never,
  );
  return { service, prisma, bot, identities };
}

describe('group workspace authorization', () => {
  it('lets a currently approved Telegram administrator manage the selected group', async () => {
    const { service } = setup();
    expect(
      await service.manager('user', row.workspaceId, 'CHLATWORK'),
    ).toMatchObject({ workspaceId: row.workspaceId, chatId: '-1001' });
  });

  it('denies a regular member management even when the platform approved their account', async () => {
    const { service, bot } = setup();
    bot.getChatMember.mockImplementation(async (_chat, user) => ({
      user: { id: user },
      status: user === 999 ? 'administrator' : 'member',
    }));
    await expect(
      service.manager('user', row.workspaceId, 'CHLATWORK'),
    ).rejects.toThrow('administrator');
  });

  it('allows an ordinary profile-free group member only within a connected workspace', async () => {
    const { service, prisma, bot } = setup();
    bot.getChatMember.mockImplementation(async (_chat, user) => ({
      user: { id: user },
      status: user === 999 ? 'administrator' : 'member',
    }));
    expect(await service.member('CHLATWORK', '-1001', '123')).toMatchObject({
      chatId: '-1001',
    });
    prisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await service.member('CHLATWORK', '-2002', '123')).toBeNull();
  });

  it('does not trust a manager candidate association after Telegram demotion or an API failure', async () => {
    const { service, bot } = setup();
    bot.getChatMember.mockRejectedValueOnce(new Error('unavailable'));
    await expect(
      service.manager('user', row.workspaceId, 'CHLATWORK'),
    ).rejects.toThrow('verify');
  });

  it.each(['REJECTED', 'SUSPENDED'])(
    'keeps explicitly %s users blocked from free member access',
    async (status) => {
      const { service, identities } = setup();
      identities.lookup.mockResolvedValueOnce({
        status,
        isActive: true,
        enabled: true,
        hasMembership: true,
      } as never);
      expect(await service.member('CHLATWORK', '-1001', '123')).toBeNull();
    },
  );

  it('denies a spoofed identity returned for the requested Telegram member', async () => {
    const { service, bot } = setup();
    bot.getChatMember.mockResolvedValueOnce({
      user: { id: 555 },
      status: 'administrator',
    });
    expect(await service.member('CHLATWORK', '-1001', '123')).toBeNull();
  });
});

it('denies an inactive canonical Telegram account even if it has no bot profile', async () => {
  const { BotAccessService } = await import('../bot-admin/bot-access.service');
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([
      {
        userId: 'inactive',
        telegramId: '123',
        status: 'PENDING',
        hasMembership: false,
        enabled: false,
        isActive: false,
      },
    ]),
  };
  const identities = new BotAccessService(prisma as never);
  const bot = { getMe: jest.fn(), getChatMember: jest.fn() };
  const service = new GroupAccessService(
    prisma as never,
    identities,
    bot as never,
    bot as never,
  );
  expect(await service.member('CHLATWORK', '-1001', '123')).toBeNull();
  expect(bot.getChatMember).not.toHaveBeenCalled();
  const sql = prisma.$queryRaw.mock.calls[0][0].join('');
  expect(sql).toContain('FROM social_accounts');
  expect(sql).toContain('LEFT JOIN telegram_bot_profiles');
});
