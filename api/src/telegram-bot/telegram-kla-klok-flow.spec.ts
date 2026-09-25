import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { MomentsService } from '../moments/moments.service';
import type { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import type { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotService } from './telegram-bot.service';
import type { TelegramKlaKlokService } from './telegram-kla-klok.service';
import {
  buildKlaKlokDealerKeyboard,
  calculateKlaKlokTelegramRound,
} from './telegram-kla-klok';

describe('Telegram Kla Klok round message lifecycle', () => {
  it('posts the result, deletes the old board, and sends a fresh next-round board', async () => {
    const gameId = '00000000-0000-4000-8000-000000000001';
    const telegramChatId = -1001234567890;
    const dealerTelegramUserId = '123';
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: {
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const bot = {
      sendMessage: jest
        .fn()
        .mockResolvedValueOnce({ message_id: 20 })
        .mockResolvedValueOnce({ message_id: 21 }),
      deleteMessage: jest.fn().mockResolvedValue(true),
      editMessage: jest.fn().mockResolvedValue(true),
      answerCallback: jest.fn().mockResolvedValue(true),
    };
    const freshRoll = {
      game: {
        id: gameId,
        telegramChatId,
        telegramChatTitle: 'Game night',
        dealerTelegramUserId,
        dealerDisplayName: 'Kakada',
        status: 'OPEN',
        currentRound: 2,
        groupMessageId: 10,
        dealerMessageId: 11,
        summaryMessageId: null,
      },
      roundNumber: 1,
      result: calculateKlaKlokTelegramRound(
        [
          {
            telegramUserId: '456',
            displayName: 'Phea',
            symbol: 'tiger' as const,
            amountRiel: 5_000n,
          },
        ],
        ['tiger', 'gourd', 'fish'],
      ),
      resultMessageId: null,
      replay: false,
    };
    const klaKlok = {
      rollRound: jest.fn().mockResolvedValue(freshRoll),
      markRoundMessage: jest.fn().mockResolvedValue(undefined),
      setGroupMessage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TelegramBotService(
      prisma as unknown as PrismaService,
      {} as ConfigService,
      bot as unknown as TelegramBotClient,
      {} as MomentsService,
      {} as TelegramAssistantAiService,
      undefined,
      undefined,
      klaKlok as unknown as TelegramKlaKlokService,
    );
    const rollData = buildKlaKlokDealerKeyboard(gameId, 1)
      .inline_keyboard[0]![0]!.callback_data;

    await service.handleUpdate({
      update_id: 1,
      callback_query: {
        id: 'roll-round-1',
        from: { id: 123, first_name: 'Kakada' },
        data: rollData,
        message: {
          message_id: 11,
          chat: { id: 123, type: 'private' },
        },
      },
    });

    expect(bot.sendMessage).toHaveBeenNthCalledWith(
      1,
      telegramChatId,
      expect.stringContaining('ROUND 1'),
    );
    expect(bot.deleteMessage).toHaveBeenCalledWith(telegramChatId, 10);
    expect(bot.sendMessage).toHaveBeenNthCalledWith(
      2,
      telegramChatId,
      expect.stringContaining('Round 2'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
    expect(klaKlok.setGroupMessage).toHaveBeenCalledWith(gameId, 21);
    expect(bot.sendMessage.mock.invocationCallOrder[0]).toBeLessThan(
      bot.deleteMessage.mock.invocationCallOrder[0]!,
    );
    expect(bot.deleteMessage.mock.invocationCallOrder[0]).toBeLessThan(
      bot.sendMessage.mock.invocationCallOrder[1]!,
    );

    klaKlok.rollRound.mockResolvedValueOnce({
      ...freshRoll,
      game: { ...freshRoll.game, groupMessageId: 21 },
      resultMessageId: 20,
      replay: true,
    });
    await service.handleUpdate({
      update_id: 2,
      callback_query: {
        id: 'roll-round-1-retry',
        from: { id: 123, first_name: 'Kakada' },
        data: rollData,
        message: {
          message_id: 11,
          chat: { id: 123, type: 'private' },
        },
      },
    });

    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(bot.deleteMessage).toHaveBeenCalledTimes(1);
    expect(klaKlok.setGroupMessage).toHaveBeenCalledTimes(1);
  });
});
