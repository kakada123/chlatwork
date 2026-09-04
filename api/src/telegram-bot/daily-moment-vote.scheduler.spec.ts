import type { ConfigService } from '@nestjs/config';
import type { MomentsService } from '../moments/moments.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { TelegramBotClient } from './telegram-bot.client';
import { DailyMomentVoteScheduler } from './daily-moment-vote.scheduler';

describe('DailyMomentVoteScheduler', () => {
  it('sends each claimed poll and records successful delivery', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
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
      getScheduledTelegramVotingMoment: jest.fn().mockResolvedValue(poll),
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
