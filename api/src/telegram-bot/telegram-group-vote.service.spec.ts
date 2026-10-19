import { ForbiddenException } from '@nestjs/common';
import { TelegramGroupVoteService } from './telegram-group-vote.service';

const workspaceId = '00000000-0000-4000-8000-000000000001';
const momentId = '00000000-0000-4000-8000-000000000002';
const roundId = '00000000-0000-4000-8000-000000000003';
const now = new Date('2026-10-19T03:00:00Z');

function setup() {
  const context = {
    workspaceId,
    chatId: '-100123',
    title: 'Lunch team',
    bot: 'CHLATWORK',
    workspaceVersion: 1,
    connectionVersion: 2,
    voting: true,
  };
  const round = {
    id: roundId,
    momentId,
    telegramChatId: -100123n,
    voteDate: new Date('2026-10-19T00:00:00Z'),
    closesAt: new Date('2026-10-19T03:30:00Z'),
    finalizedAt: null,
    moment: { groupWorkspaceId: workspaceId },
  };
  const schedule = {
    id: 'schedule',
    momentId,
    enabled: true,
    timeZone: 'Asia/Phnom_Penh',
    telegramChatId: -100123n,
    moment: {
      id: momentId,
      groupWorkspaceId: workspaceId,
      status: 'PUBLISHED',
      occasion: 'VOTING',
      publishAt: null,
      expiresAt: null,
    },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ status: 'ACTIVE', version: 1 }]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    telegramGroupConnection: {
      findUnique: jest.fn().mockResolvedValue({
        enabled: true,
        health: 'CONNECTED',
        voting: true,
        version: 2,
      }),
    },
    momentVoteSchedule: {
      findFirst: jest.fn().mockResolvedValue(schedule),
      update: jest.fn(),
    },
    momentVoteRound: {
      findUnique: jest.fn().mockResolvedValue(round),
      findFirst: jest.fn().mockResolvedValue(round),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    telegramGroupAudit: { upsert: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn().mockImplementation((fn) => fn(tx)),
    telegramGroupManager: {
      findMany: jest.fn().mockResolvedValue([{ workspaceId }]),
    },
  };
  const groups = {
    manager: jest.fn().mockResolvedValue(context),
    lockManager: jest.fn(),
  };
  const policy = { assertEnabled: jest.fn().mockResolvedValue(context) };
  const bot = { sendMessage: jest.fn(), answerCallback: jest.fn() };
  const scheduler = { refreshRound: jest.fn() };
  const service = new TelegramGroupVoteService(
    prisma as never,
    groups as never,
    policy as never,
    bot as never,
    scheduler as never,
  );
  return {
    service,
    prisma,
    tx,
    groups,
    policy,
    bot,
    scheduler,
    round,
    schedule,
  };
}

describe('Private group voting', () => {
  it('offers the configured group with a date-bound start button', async () => {
    const { service, bot } = setup();
    await service.showGroups('user', 123, 'start', 1, now);
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), {
      inline_keyboard: [
        [{ text: 'Lunch team', callback_data: `gv:s:${workspaceId}:20261019` }],
      ],
    });
  });

  it('hides groups when the requester is no longer an administrator', async () => {
    const { service, bot, groups } = setup();
    groups.manager.mockRejectedValue(new ForbiddenException('Demoted'));
    await service.showGroups('user', 123, 'start', 1, now);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('No'),
      expect.any(Object),
    );
  });

  it('rechecks live admin access before starting from an old button', async () => {
    const { service, groups, prisma } = setup();
    groups.manager.mockRejectedValue(new ForbiddenException('Demoted'));
    await expect(
      service.start('user', workspaceId, '20261019', now),
    ).rejects.toThrow('Demoted');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reuses an open round without changing the deadline', async () => {
    const { service, tx, scheduler } = setup();
    await service.start('user', workspaceId, '20261019', now);
    expect(scheduler.refreshRound).toHaveBeenCalledWith(roundId, now);
    expect(tx.momentVoteRound.updateMany).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('creates a missing round and claims today for the daily scheduler', async () => {
    const { service, tx } = setup();
    tx.momentVoteRound.findUnique.mockResolvedValueOnce(null);
    await service.start('user', workspaceId, '20261019', now);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.momentVoteSchedule.update).toHaveBeenCalledWith({
      where: { id: 'schedule' },
      data: { lastAttemptDate: new Date('2026-10-19T00:00:00Z') },
    });
  });

  it.each([
    'closed',
    'finalized',
    'other-chat',
    'old-date',
    'suspended',
    'disabled-connection',
  ])('does not start or publish a %s round', async (reason) => {
    const { service, round, tx, scheduler } = setup();
    if (reason === 'closed') round.closesAt = now;
    if (reason === 'finalized') Object.assign(round, { finalizedAt: now });
    if (reason === 'other-chat') round.telegramChatId = -999n;
    if (reason === 'suspended')
      tx.$queryRaw.mockResolvedValue([{ status: 'SUSPENDED', version: 1 }]);
    if (reason === 'disabled-connection')
      tx.telegramGroupConnection.findUnique.mockResolvedValue(null);
    await expect(
      service.start(
        'user',
        workspaceId,
        reason === 'old-date' ? '20261018' : '20261019',
        now,
      ),
    ).rejects.toThrow();
    expect(scheduler.refreshRound).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });

  it('ends only the selected round and publishes results without changing the schedule', async () => {
    const { service, tx, scheduler } = setup();
    await service.end('user', roundId, now);
    expect(tx.momentVoteRound.updateMany).toHaveBeenCalledWith({
      where: {
        id: roundId,
        telegramChatId: -100123n,
        finalizedAt: null,
        closesAt: { gt: now },
      },
      data: { closesAt: now },
    });
    expect(tx.momentVoteSchedule.update).not.toHaveBeenCalled();
    expect(scheduler.refreshRound).toHaveBeenCalledWith(roundId, now);
  });

  it('rejects a round whose chat no longer matches its group', async () => {
    const { service, round, tx } = setup();
    round.telegramChatId = -999n;
    await expect(service.end('user', roundId, now)).rejects.toThrow();
    expect(tx.momentVoteRound.updateMany).not.toHaveBeenCalled();
  });

  it('still offers an open round for ending after its daily schedule is paused', async () => {
    const { service, schedule, bot } = setup();
    schedule.enabled = false;
    await service.showGroups('user', 123, 'end', 1, now);
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), {
      inline_keyboard: [
        [{ text: 'Lunch team', callback_data: `gv:e:${roundId}` }],
      ],
    });
  });

  it('finds the open round even after the schedule timezone changes its local date', async () => {
    const { service, schedule, tx, bot, round } = setup();
    schedule.timeZone = 'America/Los_Angeles';
    tx.momentVoteRound.findUnique.mockImplementation(async (args) =>
      args.where.momentId_voteDate.voteDate
        .toISOString()
        .startsWith('2026-10-19')
        ? round
        : null,
    );
    await service.showGroups('user', 123, 'end', 1, now);
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), {
      inline_keyboard: [
        [{ text: 'Lunch team', callback_data: `gv:e:${roundId}` }],
      ],
    });
  });

  it('reports permission failures privately and does not publish', async () => {
    const { service, groups, bot, scheduler } = setup();
    groups.manager.mockRejectedValue(
      new ForbiddenException('Admin permission required'),
    );
    await service.handleCallback('user', {
      id: 'callback',
      from: { id: 123 },
      message: { message_id: 1, chat: { id: 123, type: 'private' } },
      data: `gv:s:${workspaceId}:20261019`,
    });
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      'Admin permission required',
    );
    expect(scheduler.refreshRound).not.toHaveBeenCalled();
  });

  it('continues discovery on later pages when this page has no eligible groups', async () => {
    const { service, groups, prisma, bot } = setup();
    prisma.telegramGroupManager.findMany.mockResolvedValue(
      Array.from({ length: 11 }, () => ({ workspaceId })),
    );
    groups.manager.mockRejectedValue(new ForbiddenException('Demoted'));
    await service.showGroups('user', 123, 'start', 1, now);
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), {
      inline_keyboard: [
        [{ text: 'More groups', callback_data: 'gv:p:start:2' }],
      ],
    });
  });

  it('rejects forged private callbacks before group lookup', async () => {
    const { service, groups } = setup();
    await service.handleCallback('user', {
      id: 'callback',
      from: { id: 456 },
      message: { message_id: 1, chat: { id: 123, type: 'private' } },
      data: `gv:s:${workspaceId}:20261019`,
    });
    expect(groups.manager).not.toHaveBeenCalled();
  });
});
