import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MomentsService } from '../moments/moments.service';
import type { TelegramBotClient } from './telegram-bot.client';
import type { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramBotService } from './telegram-bot.service';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

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
      $executeRaw: jest.fn().mockResolvedValue(1),
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

describe('Telegram group vote updates', () => {
  const chat = { id: -1001234567890, type: 'supergroup' };
  const hash = (identity: string) =>
    createHash('sha256').update(identity).digest('hex');
  function setup(
    identityMode:
      'NAME_REQUIRED' | 'LOGIN_REQUIRED' | 'ANONYMOUS' = 'NAME_REQUIRED',
  ) {
    const members = [
      { telegramUserId: '123', displayName: 'Sokha' },
      { telegramUserId: '456', displayName: 'Dara' },
    ];
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([{ updateId: 1n }])
        .mockResolvedValue(members),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { providerUserId: '123', userId: 'account-123' },
          ]),
      },
      momentVote: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ responseKey: hash('telegram:123') }]),
      },
    };
    const poll = {
      id: '00000000-0000-4000-8000-000000000001',
      slug: 'team-lunch',
      title: 'Team lunch',
      question: 'Where should we eat?',
      identityMode,
      voteDate: '2026-09-08',
      totalVotes: 1,
      results: [{ optionId: 'option-1', label: 'Pizza', votes: 1 }],
    };
    const moments = {
      respondToTelegramVote: jest.fn().mockResolvedValue(poll),
    };
    const bot = {
      answerCallback: jest.fn(),
      editMessage: jest.fn(),
      editInlineMessage: jest.fn(),
      sendMessage: jest.fn(),
    };
    const service = new TelegramBotService(
      prisma as never,
      { getOrThrow: () => 'https://chlatwork.com' } as never,
      bot as never,
      moments as never,
      {} as never,
    );
    const callback = {
      id: 'vote-1',
      from: { id: 123, first_name: 'Sokha' },
      data: `poll:vote:${poll.id}:option-1`,
      message: { message_id: 10, chat },
    };
    return { prisma, poll, moments, bot, service, callback };
  }

  it('reposts results with buttons and mentions only remaining members in the active round', async () => {
    const { service, prisma, bot, callback, poll } = setup();
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(bot.editMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chat.id,
      expect.stringContaining('Total votes: 1'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      [
        expect.objectContaining({
          type: 'text_mention',
          user: expect.objectContaining({ id: 456 }),
        }),
      ],
    );
    expect(prisma.momentVote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          momentId: poll.id,
          voteDate: new Date('2026-09-08T00:00:00.000Z'),
          responseKey: { in: [hash('telegram:123'), hash('telegram:456')] },
        },
      }),
    );
    const rosterQuery = prisma.$queryRaw.mock.calls[1] as unknown as [
      TemplateStringsArray,
      bigint,
    ];
    expect(rosterQuery[0].join('')).toContain('is_active = TRUE');
    expect(rosterQuery[1]).toBe(BigInt(chat.id));
  });

  it('recognizes linked-account web votes for login-required polls', async () => {
    const { service, prisma, bot, callback } = setup('LOGIN_REQUIRED');
    prisma.momentVote.findMany.mockResolvedValue([
      { responseKey: hash('account:account-123') },
    ]);
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(bot.sendMessage.mock.calls[0]?.[3]).toEqual([
      expect.objectContaining({ user: expect.objectContaining({ id: 456 }) }),
    ]);
  });

  it('resends anonymous counts without looking up or mentioning remaining voters', async () => {
    const { service, prisma, bot, callback } = setup('ANONYMOUS');
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(prisma.momentVote.findMany).not.toHaveBeenCalled();
    expect(bot.sendMessage.mock.calls[0]?.[3]).toEqual([]);
  });

  it('updates inline polls without guessing their group', async () => {
    const { service, bot, callback } = setup();
    await service.handleUpdate({
      update_id: 1,
      callback_query: {
        ...callback,
        message: undefined,
        inline_message_id: 'inline-1',
      },
    });
    expect(bot.editInlineMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it('keeps private poll callbacks in place', async () => {
    const { service, prisma, bot, callback } = setup();
    callback.message.chat = { id: 123, type: 'private' };
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(bot.editMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it('does not repost rejected votes or replayed webhook updates', async () => {
    const { service, prisma, bot, callback, moments } = setup();
    moments.respondToTelegramVote.mockRejectedValue(
      new UnauthorizedException(),
    );
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(bot.sendMessage).not.toHaveBeenCalled();
    prisma.$queryRaw.mockResolvedValue([]);
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(moments.respondToTelegramVote).toHaveBeenCalledTimes(1);
  });

  it('records departures and excludes bot identities', async () => {
    const { service, prisma } = setup();
    await service.handleUpdate({
      update_id: 1,
      chat_member: {
        chat,
        date: 1788840000,
        new_chat_member: {
          user: { id: 456, first_name: 'Dara' },
          status: 'left',
        },
      },
    });
    const write = prisma.$executeRaw.mock.calls[0] as unknown as unknown[];
    expect(write.slice(1, 5)).toEqual([BigInt(chat.id), '456', 'Dara', false]);
    expect((write[0] as TemplateStringsArray).join('')).toContain(
      'observed_at <= EXCLUDED.observed_at',
    );
    prisma.$queryRaw.mockResolvedValueOnce([{ updateId: 2n }] as never);
    await service.handleUpdate({
      update_id: 2,
      message: {
        message_id: 11,
        chat,
        from: { id: 789, is_bot: true },
      },
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('lets existing members register without linking an account', async () => {
    const { service, prisma, bot } = setup();
    await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 11,
        chat,
        from: { id: 456, first_name: 'Dara' },
        text: '/joinvote',
      },
    });
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chat.id,
      expect.stringContaining('registered'),
    );
  });
});
