import type { ConfigService } from '@nestjs/config';
import type { MomentsService } from '../moments/moments.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TelegramBotClient } from './telegram-bot.client';
import { DailyMomentVoteScheduler } from './daily-moment-vote.scheduler';

describe('DailyMomentVoteScheduler', () => {
  it('sends each claimed poll and records successful delivery', async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValue([
          {
            scheduleId: '00000000-0000-4000-8000-000000000010',
            momentId: '00000000-0000-4000-8000-000000000001',
            telegramChatId: '-1001234567890',
          },
        ]),
      momentVoteSchedule: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('https://chlatwork.com'),
    };
    const poll = {
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'team-lunch',
      title: 'Team lunch',
      question: 'Where should we eat?',
      identityMode: 'NAME_REQUIRED' as const,
      voteDate: '2026-09-04',
      totalVotes: 0,
      results: [
        { optionId: 'option-1', label: 'Khmer food', votes: 0, voters: [] },
        { optionId: 'option-2', label: 'Pizza', votes: 0, voters: [] },
      ],
    };
    const moments = {
      startTelegramVoteRound: jest.fn().mockResolvedValue(poll),
    };
    const bot = { sendMessage: jest.fn().mockResolvedValue({}) };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      bot as unknown as TelegramBotClient,
      moments as unknown as MomentsService,
    );

    await expect(
      scheduler.runOnce(new Date('2026-09-04T03:00:00.000Z')),
    ).resolves.toBe(1);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      -1001234567890,
      expect.stringContaining('2026-09-04'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
    expect(prisma.momentVoteSchedule.update).toHaveBeenCalledWith({
      where: { id: '00000000-0000-4000-8000-000000000010' },
      data: { lastSentAt: expect.any(Date) },
    });
  });
});


describe('Daily vote timer finalization', () => {
  const roundId = '00000000-0000-4000-8000-000000000003';
  const deadline = new Date('2026-09-08T03:30:00Z');
  function setup(failEdit = false) {
    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([
          {
            telegramChatId: -100n,
            messageId: 88 as number | null,
            closesAt: deadline,
          },
        ]),
      $executeRaw: jest.fn(),
    };
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ id: roundId }])
        .mockResolvedValue([]),
      $transaction: jest.fn().mockImplementation((work) => work(tx)),
    };
    const bot = {
      editMessage: failEdit
        ? jest.fn().mockRejectedValue(new Error('Unavailable'))
        : jest.fn(),
      sendMessage: jest.fn(),
      sendAnimation: jest.fn().mockResolvedValue({ message_id: 99 }),
    };
    const moments = {
      getTelegramVoteRoundResults: jest
        .fn()
        .mockResolvedValue({
          id: 'moment',
          slug: 'lunch',
          title: 'Lunch',
          question: 'Lunch?',
          roundId,
          closesAt: deadline.toISOString(),
          identityMode: 'ANONYMOUS',
          totalVotes: 3,
          participants: ['Sokha'],
          results: [{ optionId: 'option-1', label: 'Pizza', votes: 3 }],
        }),
    };
    const scheduler = new DailyMomentVoteScheduler(
      prisma as never,
      { getOrThrow: () => 'https://example.com' } as never,
      bot as never,
      moments as never,
    );
    return { tx, prisma, bot, moments, scheduler };
  }
  it('edits the tracked message into a celebration and records final delivery', async () => {
    const { tx, bot, scheduler } = setup();
    await scheduler.runOnce(deadline);
    expect(bot.editMessage).toHaveBeenCalledWith(
      -100,
      88,
      expect.stringContaining('🏆 Winner: Pizza'),
      {
        inline_keyboard: [
          [{ text: 'Details', url: 'https://example.com/m/lunch' }],
        ],
      },
    );
    expect(tx.$executeRaw.mock.calls[0][0].join('')).toContain(
      'SET finalized_at',
    );
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(bot.sendAnimation).toHaveBeenCalledWith(
      -100,
      'https://example.com/images/telegram/vote-celebration.gif',
      88,
    );
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      bot.sendAnimation.mock.invocationCallOrder[0]!,
    );
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledTimes(1);
  });
  it('leaves failed final edits retryable without marking delivery complete', async () => {
    const { tx, bot, scheduler } = setup(true);
    await scheduler.runOnce(deadline);
    expect(tx.$executeRaw).not.toHaveBeenCalled();
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });
  it('skips a round already claimed or completed by another replica', async () => {
    const { tx, bot, scheduler } = setup();
    tx.$queryRaw.mockResolvedValue([]);
    await scheduler.runOnce(deadline);
    expect(bot.editMessage).not.toHaveBeenCalled();
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });

  it('does not celebrate an open round or a round with no votes', async () => {
    const open = setup();
    await open.scheduler.runOnce(new Date(deadline.getTime() - 60_000));
    expect(open.bot.sendAnimation).not.toHaveBeenCalled();
    expect(open.tx.$executeRaw).not.toHaveBeenCalled();

    const empty = setup();
    const poll = await empty.moments.getTelegramVoteRoundResults();
    empty.moments.getTelegramVoteRoundResults.mockResolvedValue({
      ...poll,
      totalVotes: 0,
      results: [{ optionId: 'option-1', label: 'Pizza', votes: 0 }],
    });
    await empty.scheduler.runOnce(deadline);
    expect(empty.tx.$executeRaw).toHaveBeenCalled();
    expect(empty.bot.sendAnimation).not.toHaveBeenCalled();
  });

  it('keeps finalization complete when animation delivery fails', async () => {
    const { tx, bot, scheduler } = setup();
    bot.sendAnimation.mockRejectedValue(new Error('Unavailable'));
    await scheduler.runOnce(deadline);
    expect(tx.$executeRaw.mock.calls[0][0].join('')).toContain(
      'SET finalized_at',
    );
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledTimes(1);
  });

  it('does not send an animation if the finalization transaction fails to commit', async () => {
    const { prisma, bot, scheduler } = setup();
    const transaction = prisma.$transaction.getMockImplementation()!;
    prisma.$transaction.mockImplementation(async (work) => {
      await transaction(work);
      throw new Error('Commit failed');
    });
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).not.toHaveBeenCalled();
  });

  it('replies to the recovered final message when initial delivery was missing', async () => {
    const { tx, bot, scheduler } = setup();
    tx.$queryRaw.mockResolvedValue([
      { telegramChatId: -100n, messageId: null, closesAt: deadline },
    ]);
    bot.sendMessage.mockResolvedValue({ message_id: 123 });
    await scheduler.runOnce(deadline);
    expect(bot.sendAnimation).toHaveBeenCalledWith(
      -100,
      'https://example.com/images/telegram/vote-celebration.gif',
      123,
    );
  });
});
