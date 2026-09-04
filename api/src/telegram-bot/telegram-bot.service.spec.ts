import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MomentsService } from '../moments/moments.service';
import type { TelegramBotClient } from './telegram-bot.client';
import type { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramBotService } from './telegram-bot.service';

describe('TelegramBotService', () => {
  it('uses a constant-length digest comparison for the webhook secret', () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('correct_webhook_secret_1234'),
    };
    const service = new TelegramBotService(
      {} as PrismaService,
      config as unknown as ConfigService,
      {} as TelegramBotClient,
      {} as MomentsService,
      {} as TelegramAssistantAiService,
    );

    expect(service.isValidWebhookSecret('correct_webhook_secret_1234')).toBe(
      true,
    );
    expect(service.isValidWebhookSecret('incorrect_webhook_secret')).toBe(
      false,
    );
    expect(service.isValidWebhookSecret()).toBe(false);
  });

  it('lets a linked poll owner schedule a daily vote from the target group', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: {
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      socialAccount: {
        findUnique: jest.fn().mockResolvedValue({
          user: {
            id: '00000000-0000-4000-8000-000000000002',
            isActive: true,
            telegramNotificationTimeZone: 'Asia/Phnom_Penh',
            expenseProfile: null,
          },
        }),
      },
    };
    const config = {
      getOrThrow: jest
        .fn()
        .mockImplementation((key: string) =>
          key === 'FRONTEND_ORIGIN'
            ? 'https://chlatwork.com'
            : 'correct_webhook_secret_1234',
        ),
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
      configureDailyTelegramVote: jest.fn().mockResolvedValue(poll),
    };
    const bot = {
      answerCallback: jest.fn().mockResolvedValue({}),
      sendMessage: jest.fn().mockResolvedValue({}),
      isChatAdministrator: jest.fn().mockResolvedValue(true),
    };
    const service = new TelegramBotService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      bot as unknown as TelegramBotClient,
      moments as unknown as MomentsService,
      {} as TelegramAssistantAiService,
    );

    await service.handleUpdate({
      update_id: 1,
      callback_query: {
        id: 'callback-1',
        from: { id: 123, first_name: 'Sokha' },
        data: `poll:daily:${poll.id}`,
        message: {
          message_id: 10,
          chat: { id: -1001234567890, type: 'supergroup', title: 'Lunch team' },
        },
      },
    });

    expect(moments.configureDailyTelegramVote).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000002',
      poll.id,
      -1001234567890,
      'Lunch team',
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      -1001234567890,
      expect.stringContaining('Daily vote enabled'),
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      -1001234567890,
      expect.stringContaining('Where should we eat?'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
  });
});
