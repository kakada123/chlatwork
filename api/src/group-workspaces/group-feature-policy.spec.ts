import { GroupFeaturePolicy } from './group-feature-policy';
const context = {
  workspaceId: 'A',
  chatId: '-1001',
  bot: 'CHLATWORK',
  voting: true,
};
it('rechecks a workspace after the caller obtained its context', async () => {
  const groups = {
    connection: jest
      .fn()
      .mockResolvedValue({ ...context, status: 'SUSPENDED' }),
    active: jest.fn().mockReturnValue(false),
  };
  const policy = new GroupFeaturePolicy(
    groups as never,
    {} as never,
    {} as never,
  );
  await expect(
    policy.assertEnabled(context as never, 'voting'),
  ).rejects.toThrow('unavailable');
});
it('denies a platform-disabled feature even when group enabled it', async () => {
  const groups = {
    connection: jest.fn().mockResolvedValue(context),
    active: () => true,
    verifyRole: jest.fn().mockResolvedValue(true),
    botId: async () => 999,
  };
  const policy = new GroupFeaturePolicy(
    groups as never,
    { isEnabled: jest.fn().mockResolvedValue(false) } as never,
    {} as never,
  );
  await expect(
    policy.assertEnabled(context as never, 'voting'),
  ).rejects.toThrow('unavailable');
});

it('deduplicates privacy-safe usage events without retaining message text or balances', async () => {
  const groups = { forChat: jest.fn().mockResolvedValue({ workspaceId: 'A' }) };
  const prisma = { telegramGroupAudit: { upsert: jest.fn() } };
  const policy = new GroupFeaturePolicy(
    groups as never,
    {} as never,
    prisma as never,
  );
  await policy.record('CHLATWORK', '-1001', '123', 'VOTE_CAST', 'callback-1');
  await policy.record('CHLATWORK', '-1001', '123', 'VOTE_CAST', 'callback-1');
  const call = prisma.telegramGroupAudit.upsert.mock.calls[0][0];
  expect(call).toEqual(prisma.telegramGroupAudit.upsert.mock.calls[1][0]);
  expect(call.create).toMatchObject({
    workspaceId: 'A',
    telegramUserId: 123n,
    action: 'VOTE_CAST',
  });
  expect(call.create.details).toBeUndefined();
});
