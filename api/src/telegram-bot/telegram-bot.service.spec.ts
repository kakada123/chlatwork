import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MomentsService } from '../moments/moments.service';
import type { TelegramBotClient } from './telegram-bot.client';
import type { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramBotService } from './telegram-bot.service';
import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

describe('TelegramBotService', () => {
  it('resets today only after the requesting linked admin confirms', async () => {
    const chat = { id: -1001234567890, type: 'supergroup', title: 'Lunch team' };
    const roundId = '00000000-0000-4000-8000-000000000004';
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: { findUnique: jest.fn().mockResolvedValue({
        user: { id: '00000000-0000-4000-8000-000000000002', isActive: true },
      }) },
    };
    const moments = {
      getTodayTelegramVoteRound: jest.fn().mockResolvedValue({ id: roundId }),
      resetTodayTelegramVote: jest.fn().mockResolvedValue({ deletedVotes: 2, messageId: 10 }),
    };
    const bot = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 11 }),
      answerCallback: jest.fn(),
      deleteMessage: jest.fn().mockResolvedValue(true),
      isChatAdministrator: jest.fn().mockResolvedValue(true),
    };
    const service = new TelegramBotService(
      prisma as never,
      {} as never,
      bot as never,
      moments as never,
      {} as never,
    );

    await service.handleUpdate({
      update_id: 1,
      message: { message_id: 1, chat, from: { id: 123, first_name: 'Sokha' }, text: '/resettodayvote' },
    });
    expect(moments.resetTodayTelegramVote).not.toHaveBeenCalled();
    const keyboard = bot.sendMessage.mock.calls[0]?.[2] as {
      inline_keyboard: Array<Array<{ callback_data: string }>>;
    };
    const confirmData = keyboard.inline_keyboard[0]![0]!.callback_data;
    await service.handleUpdate({
      update_id: 2,
      callback_query: {
        id: 'other-admin', from: { id: 456, first_name: 'Dara' },
        data: confirmData, message: { message_id: 11, chat },
      },
    });
    expect(moments.resetTodayTelegramVote).not.toHaveBeenCalled();

    await service.handleUpdate({
      update_id: 3,
      callback_query: {
        id: 'owner-admin', from: { id: 123, first_name: 'Sokha' },
        data: confirmData, message: { message_id: 11, chat },
      },
    });
    expect(moments.resetTodayTelegramVote).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000002', chat.id, roundId,
    );
    expect(bot.deleteMessage).toHaveBeenCalledWith(chat.id, 10);
  });

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
      expect.stringContaining('Daily vote: 10:00'),
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      -1001234567890,
      '🗳 Team lunch',
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
      getTelegramVotingMoment: jest.fn().mockResolvedValue(poll),
    };
    const bot = {
      answerCallback: jest.fn(),
      editMessage: jest.fn(),
      editInlineMessage: jest.fn(),
      sendMessage: jest.fn(),
      deleteMessage: jest.fn().mockResolvedValue(true),
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
      data: `pv:y:v:${poll.id.replace(/-/g, '')}:option-1:3f`,
      message: { message_id: 11, chat, reply_to_message: { message_id: 10, chat } },
    };
    return { prisma, poll, moments, bot, service, callback };
  }

  it('asks the voter to confirm before recording a group vote', async () => {
    const { service, bot, callback, poll, moments } = setup();
    await service.handleUpdate({
      update_id: 1,
      callback_query: { ...callback, data: `poll:vote:${poll.id}:option-1`, message: { message_id: 10, chat } },
    });
    expect(moments.respondToTelegramVote).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chat.id,
      expect.stringContaining('Pizza'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      undefined,
      10,
    );
  });

  it('allows a later added choice to reach the Telegram confirmation', async () => {
    const { service, bot, callback, poll } = setup();
    poll.results.push({ optionId: 'option-15', label: 'Noodles', votes: 0 });
    await service.handleUpdate({
      update_id: 1,
      callback_query: {
        ...callback,
        data: `poll:vote:${poll.id}:option-15`,
        message: { message_id: 10, chat },
      },
    });
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chat.id,
      expect.stringContaining('Noodles'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      undefined,
      10,
    );
  });

  it('does not accept another group member pressing a confirmation button', async () => {
    const { service, bot, callback, moments } = setup();
    await service.handleUpdate({
      update_id: 1,
      callback_query: { ...callback, from: { id: 456, first_name: 'Dara' } },
    });
    expect(moments.respondToTelegramVote).not.toHaveBeenCalled();
    expect(bot.editMessage).not.toHaveBeenCalled();
    expect(bot.answerCallback).toHaveBeenCalledWith(
      callback.id,
      'This poll action is invalid.',
    );
  });

  it('reposts the compact poll with buttons and mentions only remaining members in the active round', async () => {
    const { service, prisma, bot, callback, poll } = setup();
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(bot.editMessage).not.toHaveBeenCalled();
    expect(bot.deleteMessage).toHaveBeenCalledWith(chat.id, 10);
    expect(bot.deleteMessage.mock.invocationCallOrder[0]).toBeGreaterThan(
      bot.sendMessage.mock.invocationCallOrder[0]!,
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chat.id,
      expect.stringContaining('🗳 Team lunch'),
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

  it.each([1, 2])('keeps the old message when repost part %i fails', async (failedPart) => {
    const { service, prisma, bot, callback } = setup();
    prisma.$queryRaw.mockResolvedValue(
      Array.from({ length: 60 }, (_, index) => ({
        telegramUserId: String(1000 + index),
        displayName: `Member ${index}`,
      })),
    );
    if (failedPart === 2) bot.sendMessage.mockResolvedValueOnce({});
    bot.sendMessage.mockRejectedValueOnce(new Error('Delivery failed'));

    await expect(
      service.handleUpdate({ update_id: 1, callback_query: callback }),
    ).rejects.toThrow('Delivery failed');
    expect(bot.sendMessage).toHaveBeenCalledTimes(failedPart);
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });

  it('finishes a saved vote when Telegram refuses to delete the old message', async () => {
    const { service, prisma, bot, callback, moments } = setup();
    bot.deleteMessage.mockRejectedValueOnce(new Error('Deletion refused'));

    await expect(
      service.handleUpdate({ update_id: 1, callback_query: callback }),
    ).resolves.toBeUndefined();
    expect(moments.respondToTelegramVote).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(bot.deleteMessage).toHaveBeenCalledWith(chat.id, 10);
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalledWith({
      where: { updateId: 1n },
      data: { processedAt: expect.any(Date) },
    });
    expect(prisma.telegramBotUpdate.deleteMany).not.toHaveBeenCalled();
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

  it('does not cast an inline vote without confirmation', async () => {
    const { service, bot, callback, moments, poll } = setup();
    await service.handleUpdate({
      update_id: 1,
      callback_query: {
        ...callback,
        data: `poll:vote:${poll.id}:option-1`,
        message: undefined,
        inline_message_id: 'inline-1',
      },
    });
    expect(bot.editInlineMessage).not.toHaveBeenCalled();
    expect(moments.respondToTelegramVote).not.toHaveBeenCalled();
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(bot.deleteMessage).not.toHaveBeenCalled();
  });

  it('keeps private poll callbacks in place', async () => {
    const { service, prisma, bot, callback } = setup();
    callback.message.chat = { id: 123, type: 'private' };
    callback.message.reply_to_message.chat = callback.message.chat;
    await service.handleUpdate({ update_id: 1, callback_query: callback });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(bot.editMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage).not.toHaveBeenCalled();
    expect(bot.deleteMessage).toHaveBeenCalledWith(123, 11);
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
    expect(bot.deleteMessage).not.toHaveBeenCalled();
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
      'Vote reminders enabled.',
    );
  });
});


describe('Final split participant ownership', () => {
  const splitId = '00000000-0000-4000-8000-000000000010';
  const participantId = '00000000-0000-4000-8000-000000000011';
  function setup(userId = 123) {
    const current = {
      id: participantId,
      splitId,
      telegramUserId: '123',
      paidAt: null,
      split: { id: splitId, telegramChatId: -100n, status: 'OPEN' },
    };
    const prisma = {
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      telegramGroupSplitParticipant: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn(),
      },
      telegramGroupSplit: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: splitId,
            title: 'Bill',
            total: '10',
            currency: 'USD',
            status: 'OPEN',
            participants: [
              {
                id: participantId,
                position: 0,
                name: 'Dara',
                amount: '10',
                telegramDisplayName: null,
                paidAt: new Date(),
              },
            ],
          }),
      },
    };
    prisma.$transaction.mockImplementation((work) => work(prisma));
    const bot = { answerCallback: jest.fn(), editMessage: jest.fn() };
    const service = new TelegramBotService(
      prisma as never,
      {} as never,
      bot as never,
      {} as never,
      {} as never,
    );
    const callback = {
      id: 'paid',
      from: { id: userId, first_name: 'Dara' },
      message: { message_id: 1, chat: { id: -100, type: 'supergroup' } },
    };
    return { prisma, bot, service, callback, current };
  }
  it('joining by default does not mean paid; the assigned person can confirm payment', async () => {
    const { prisma, bot, service, callback } = setup();
    await service['handleGroupSplitToggle'](
      callback,
      'split:toggle:' + participantId,
    );
    expect(prisma.telegramGroupSplitParticipant.update).toHaveBeenCalledWith({
      where: { id: participantId },
      data: {
        telegramUserId: '123',
        telegramDisplayName: 'Dara',
        paidAt: expect.any(Date),
      },
    });
    expect(bot.answerCallback).toHaveBeenCalledWith('paid', 'Marked as paid.');
  });
  it('prevents another member from claiming a default participant share', async () => {
    const { prisma, service, callback } = setup(456);
    await service['handleGroupSplitToggle'](
      callback,
      'split:toggle:' + participantId,
    );
    expect(prisma.telegramGroupSplitParticipant.update).not.toHaveBeenCalled();
  });
  it('undoes only the payment mark and retains participant ownership', async () => {
    const { prisma, service, callback, current } = setup();
    (current as { paidAt: Date | null }).paidAt = new Date();
    await service['handleGroupSplitToggle'](
      callback,
      'split:toggle:' + participantId,
    );
    expect(prisma.telegramGroupSplitParticipant.update).toHaveBeenCalledWith({
      where: { id: participantId },
      data: { paidAt: null },
    });
  });
});
