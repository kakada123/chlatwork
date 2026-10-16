import { GroupVoteService } from './group-vote.service';
it('rejects invalid timezones before opening a transaction', async () => {
  const prisma = { $transaction: jest.fn() };
  const service = new GroupVoteService(prisma as never, {} as never);
  await expect(
    service.save(
      'user',
      'group',
      {
        question: 'Lunch?',
        options: [{ label: 'Rice' }, { label: 'Soup' }],
        timeZone: 'Not/AZone',
        sendHour: 10,
        sendMinute: 0,
        durationMinutes: 30,
        enabled: true,
        expectedVersion: 0,
      },
      '12345678',
    ),
  ).rejects.toThrow('timezone');
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it('rejects a stale group save before editing votes or schedule', async () => {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ version: 2, status: 'ACTIVE' }]),
    telegramGroupAudit: { findUnique: jest.fn().mockResolvedValue(null) },
    moment: { findUnique: jest.fn() },
  };
  const prisma = { $transaction: async (fn: Function) => fn(tx) };
  const service = new GroupVoteService(
    prisma as never,
    {
      lockManager: jest.fn(),
      manager: jest
        .fn()
        .mockResolvedValue({ workspaceId: 'group', chatId: '-1001' }),
    } as never,
  );
  await expect(
    service.save(
      'user',
      'group',
      {
        question: 'Lunch?',
        options: [{ label: 'Rice' }, { label: 'Soup' }],
        timeZone: 'Asia/Phnom_Penh',
        sendHour: 10,
        sendMinute: 0,
        durationMinutes: 30,
        enabled: true,
        expectedVersion: 0,
      },
      '12345678',
    ),
  ).rejects.toThrow('Refresh');
  expect(tx.moment.findUnique).not.toHaveBeenCalled();
});

it('checks suspension again under the workspace lock before resetting ballots', async () => {
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValue([{ status: 'SUSPENDED', version: 1 }]),
    telegramGroupAudit: { findUnique: jest.fn().mockResolvedValue(null) },
    momentVote: { deleteMany: jest.fn() },
  };
  const groups = {
    manager: jest.fn().mockResolvedValue({ workspaceVersion: 0 }),
    lockManager: jest.fn(),
  };
  const service = new GroupVoteService(
    { $transaction: async (fn: Function) => fn(tx) } as never,
    groups as never,
  );
  await expect(
    service.reset('manager', 'workspace', 'round', 'reset-key-1'),
  ).rejects.toThrow('unavailable');
  expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
});
