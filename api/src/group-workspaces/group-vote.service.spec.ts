import { GroupVoteService } from './group-vote.service';
import { createHash } from 'node:crypto';

const NOW = new Date('2026-10-20T03:00:00Z');
const OLD_ROUND = '00000000-0000-4000-8000-000000000001';
const NEW_ROUND = '00000000-0000-4000-8000-000000000002';

function resetSetup() {
  const context = {
    workspaceId: 'workspace',
    workspaceVersion: 1,
    connectionVersion: 1,
    chatId: '-1001',
  };
  const schedule = {
    id: 'schedule',
    enabled: false,
    timeZone: 'Asia/Phnom_Penh',
    telegramChatId: -1001n,
    durationMinutes: 30,
  };
  const round = {
    id: OLD_ROUND,
    momentId: 'moment',
    voteDate: new Date('2026-10-20T00:00:00Z'),
    telegramChatId: -1001n,
    messageId: 10,
    closesAt: new Date(NOW.getTime() - 1),
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ status: 'ACTIVE', version: 1 }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    telegramGroupConnection: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          enabled: true,
          health: 'CONNECTED',
          voting: true,
          version: 1,
        }),
    },
    moment: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'moment',
        status: 'PUBLISHED',
        occasion: 'VOTING',
        expiresAt: null,
        publishAt: null,
        voteSchedule: schedule,
      }),
    },
    momentVoteRound: {
      findFirst: jest.fn().mockResolvedValue(round),
      findUnique: jest.fn().mockResolvedValue({ ...round, id: NEW_ROUND }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ ...round, id: NEW_ROUND }),
      delete: jest.fn().mockResolvedValue(round),
    },
    momentVote: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
    momentVoteSchedule: { update: jest.fn() },
    telegramGroupChatAlias: {
      findMany: jest.fn().mockResolvedValue([{ telegramChatId: -1001n }]),
    },
    telegramGroupWorkspace: { update: jest.fn() },
    telegramGroupAudit: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
  };
  const groups = {
    manager: jest.fn().mockResolvedValue(context),
    lockManager: jest.fn(),
    client: () => ({ deleteMessage: deleteMessage }),
  };
  const deleteMessage = jest.fn().mockResolvedValue(true);
  const scheduler = { refreshRound: jest.fn() };
  const policy = { assertEnabled: jest.fn() };
  const service = new GroupVoteService(
    { $transaction: async (fn: Function) => fn(tx) } as never,
    groups as never,
    scheduler as never,
    policy as never,
  );
  return {
    service,
    tx,
    groups,
    scheduler,
    policy,
    round,
    schedule,
    deleteMessage,
  };
}

describe('Reset and reopen group voting', () => {
  it.each(['open', 'closed'])(
    'clears today and immediately publishes a fresh round when the old round is %s',
    async (state) => {
      const { service, tx, scheduler, round, deleteMessage } = resetSetup();
      if (state === 'open') round.closesAt = new Date(NOW.getTime() + 60_000);
      jest.useFakeTimers().setSystemTime(NOW);
      try {
        await expect(
          service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
        ).resolves.toMatchObject({ updated: true });
        expect(tx.momentVote.deleteMany).toHaveBeenCalledWith({
          where: {
            momentId: 'moment',
            voteDate: new Date('2026-10-20T00:00:00Z'),
          },
        });
        expect(tx.momentVoteRound.delete).toHaveBeenCalledWith({
          where: { id: OLD_ROUND },
        });
        expect(scheduler.refreshRound).toHaveBeenCalledWith(NEW_ROUND, NOW);
        expect(tx.momentVoteSchedule.update).toHaveBeenCalledWith({
          where: { id: 'schedule' },
          data: {
            lastAttemptDate: new Date('2026-10-20T00:00:00Z'),
            lastSentAt: null,
          },
        });
        expect(deleteMessage).toHaveBeenCalledWith(-1001, 10);
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it('rejects an earlier day without deleting its history', async () => {
    const { service, tx, round } = resetSetup();
    round.voteDate = new Date('2026-10-19T00:00:00Z');
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      await expect(
        service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
      ).rejects.toThrow();
      expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
      expect(tx.momentVoteRound.delete).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not clear ballots again when the same operation is retried', async () => {
    const { service, tx, scheduler } = resetSetup();
    tx.telegramGroupAudit.findUnique.mockResolvedValue({
      workspaceId: 'workspace',
      action: 'VOTE_RESET',
      details: {
        fingerprint: createHash('sha256')
          .update(JSON.stringify({ roundId: OLD_ROUND }))
          .digest('hex'),
        result: { roundId: NEW_ROUND, oldMessageId: 10, oldChatId: '-1001' },
      },
    });
    tx.telegramGroupAudit.findUniqueOrThrow.mockResolvedValue(
      await tx.telegramGroupAudit.findUnique(),
    );
    await service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1');
    expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
    expect(tx.momentVoteRound.delete).not.toHaveBeenCalled();
    expect(scheduler.refreshRound).toHaveBeenCalledWith(
      NEW_ROUND,
      expect.any(Date),
    );
  });

  it('keeps the reopened round retryable when Telegram delivery fails', async () => {
    const { service, scheduler, tx, deleteMessage } = resetSetup();
    scheduler.refreshRound.mockRejectedValue(new Error('delivery failed'));
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      await expect(
        service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
      ).resolves.toMatchObject({ updated: true, deliveryPending: true });
      expect(tx.momentVoteRound.delete).toHaveBeenCalledTimes(1);
      expect(deleteMessage).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('can reset and reopen a replacement again on the same day', async () => {
    const { service, tx, scheduler, round } = resetSetup();
    const thirdRound = '00000000-0000-4000-8000-000000000003';
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      await service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1');
      Object.assign(round, { id: NEW_ROUND, messageId: 12 });
      tx.momentVoteRound.findUniqueOrThrow.mockResolvedValue({
        ...round,
        id: thirdRound,
      });
      await service.reset('manager', 'workspace', NEW_ROUND, 'reset-key-2');
      expect(tx.momentVoteRound.delete.mock.calls).toEqual([
        [{ where: { id: OLD_ROUND } }],
        [{ where: { id: NEW_ROUND } }],
      ]);
      expect(scheduler.refreshRound.mock.calls).toEqual([
        [NEW_ROUND, NOW],
        [thirdRound, NOW],
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not clear ballots when group voting is disabled', async () => {
    const { service, policy, tx } = resetSetup();
    policy.assertEnabled.mockRejectedValue(
      new Error('Group feature unavailable'),
    );
    await expect(
      service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
    ).rejects.toThrow('unavailable');
    expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
  });

  it.each(['permissions-lost', 'disabled', 'changed-version'])(
    'does not clear ballots when the connection changes before its row lock (%s)',
    async (reason) => {
      const { service, tx } = resetSetup();
      tx.telegramGroupConnection.findUnique.mockResolvedValue({
        enabled: reason !== 'disabled',
        health:
          reason === 'permissions-lost' ? 'MISSING_PERMISSIONS' : 'CONNECTED',
        voting: true,
        version: reason === 'changed-version' ? 2 : 1,
      });
      jest.useFakeTimers().setSystemTime(NOW);
      try {
        await expect(
          service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
        ).rejects.toThrow('unavailable');
        expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
        expect(tx.momentVoteRound.delete).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    },
  );

  it('completes the reset when removal of the old Telegram message fails', async () => {
    const { service, deleteMessage, tx } = resetSetup();
    deleteMessage.mockRejectedValue(new Error('Message already deleted'));
    jest.useFakeTimers().setSystemTime(NOW);
    try {
      await expect(
        service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
      ).resolves.toMatchObject({ updated: true, deliveryPending: false });
      expect(tx.momentVoteRound.delete).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not reset a replacement round from a stale confirmation', async () => {
    const { service, tx } = resetSetup();
    tx.momentVoteRound.findFirst.mockResolvedValue(null);
    await expect(
      service.reset('manager', 'workspace', OLD_ROUND, 'reset-key-1'),
    ).rejects.toThrow();
    expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
  });
});
it('rejects invalid timezones before opening a transaction', async () => {
  const prisma = { $transaction: jest.fn() };
  const service = new GroupVoteService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
  );
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
    {} as never,
    {} as never,
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
    {} as never,
    { assertEnabled: jest.fn() } as never,
  );
  await expect(
    service.reset('manager', 'workspace', 'round', 'reset-key-1'),
  ).rejects.toThrow('unavailable');
  expect(tx.momentVote.deleteMany).not.toHaveBeenCalled();
});
