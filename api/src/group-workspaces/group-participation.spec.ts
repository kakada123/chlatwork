import { BotGatewayService } from '../bot-admin/bot-gateway.service';
import { GroupWorkspaceService } from './group-workspace.service';

function gateway() {
  const access = {
    lookup: jest.fn().mockResolvedValue(null),
    activity: jest.fn(),
    register: jest.fn(),
  };
  const qr = {
    current: jest.fn().mockResolvedValue(null),
    awaiting: jest.fn().mockResolvedValue(null),
  };
  const client = { sendMessage: jest.fn(), answerCallback: jest.fn() };
  const context = { workspaceId: 'A', chatId: '-1001', khqr: true };
  const groups = {
    member: jest.fn().mockResolvedValue(context),
    personalQr: jest.fn().mockResolvedValue(context),
  };
  const policy = {
    assertEnabled: jest.fn(),
    callback: jest.fn().mockResolvedValue(true),
  };
  const service = new BotGatewayService(
    access as never,
    qr as never,
    { getOrThrow: () => 'https://example.test' } as never,
    client as never,
    client as never,
    groups as never,
    undefined,
    policy as never,
  );
  const message = {
    update_id: 1,
    message: {
      message_id: 10,
      chat: { id: -1001, type: 'supergroup' },
      from: { id: 123 },
      text: '/split 36000/6',
    },
  };
  return { service, access, qr, client, groups, policy, message };
}
it('allows a profile-free member to split without creating an identity or wallet', async () => {
  const { service, access, message, policy } = gateway();
  expect(await service.handle('CHLATWORK', message)).toBe(false);
  expect(access.register).not.toHaveBeenCalled();
  expect(access.activity).not.toHaveBeenCalled();
  expect(policy.assertEnabled).toHaveBeenCalledWith(
    expect.objectContaining({ workspaceId: 'A' }),
    'split',
  );
});
it('denies the same free command in an unconnected group', async () => {
  const { service, groups, message, policy } = gateway();
  groups.member.mockResolvedValueOnce(null as never);
  expect(await service.handle('CHLATWORK', message)).toBe(true);
  expect(policy.assertEnabled).not.toHaveBeenCalled();
});
it('does not let a free member invoke AI or group configuration', async () => {
  const { service, message } = gateway();
  message.message.text = '/grammar hi';
  expect(await service.handle('CREATOR', message)).toBe(true);
  message.message.text = '/dailyvote';
  expect(await service.handle('CHLATWORK', message)).toBe(true);
});
it('permits private own KHQR without manager approval', async () => {
  const { service, access, qr, message } = gateway();
  access.lookup.mockResolvedValue({
    userId: 'owner',
    status: 'PENDING',
    enabled: true,
    isActive: true,
  } as never);
  message.message.chat = { id: 123, type: 'private' };
  message.message.text = '/myqr';
  expect(await service.handle('CHLATWORK', message)).toBe(true);
  expect(qr.current).toHaveBeenCalledWith('owner');
});
it('reads existing credits without initializing a welcome wallet', async () => {
  const prisma = {
    telegramBotProfile: {
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ status: 'PENDING', managerRequestedAt: null }),
    },
    aiWallet: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const identities = {
    ensureProfile: jest.fn().mockResolvedValue({ enabled: true }),
  };
  const groups = {
    client: () => ({ getMe: async () => ({ username: 'testbot' }) }),
  };
  const service = new GroupWorkspaceService(
    prisma as never,
    groups as never,
    identities as never,
  );
  expect(await service.session('member', 'CHLATWORK')).toMatchObject({
    balance: 0,
    managerStatus: 'NOT_REQUESTED',
  });
  expect(prisma.aiWallet.findUnique).toHaveBeenCalledWith({
    where: { userId: 'member' },
    select: { balance: true },
  });
});

it.each(['/$', '/tg_123', ' /$', ' /tg_123'])(
  'routes existing KHQR command %s through group policy for approved and free users',
  async (text) => {
    const { service, message, access, policy } = gateway();
    message.message.text = text;
    expect(await service.handle('CHLATWORK', message)).toBe(false);
    expect(policy.assertEnabled).toHaveBeenCalledWith(
      expect.any(Object),
      'khqr',
    );
    access.lookup.mockResolvedValue({
      userId: 'approved',
      status: 'APPROVED',
      enabled: true,
      isActive: true,
    } as never);
    policy.assertEnabled.mockRejectedValueOnce(new Error('group disabled'));
    expect(await service.handle('CHLATWORK', message)).toBe(true);
  },
);
