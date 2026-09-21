import { CreatorTelegramService } from '../creator-telegram/creator-telegram.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

describe('Telegram availability enforcement', () => {
  it('rejects a disabled Creator mode before saving a mode or queuing work', async () => {
    const prisma = {
      creatorTelegramChat: { createMany: jest.fn() },
      creatorTelegramRequest: { create: jest.fn() },
    };
    const bot = { sendMessage: jest.fn() };
    const availability = {
      isEnabled: jest.fn().mockResolvedValue(false),
      disabledKeys: jest.fn().mockResolvedValue(['creator:KHMER_GRAMMAR']),
    };
    const service = new CreatorTelegramService(
      prisma as never,
      { get: jest.fn(), getOrThrow: () => 'https://example.test' } as never,
      bot as never,
      {} as never,
      {} as never,
      {} as never,
      availability as never,
    );
    await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123 },
        chat: { id: 123, type: 'private' },
        text: '/grammar',
      },
    });
    expect(prisma.creatorTelegramChat.createMany).not.toHaveBeenCalled();
    expect(prisma.creatorTelegramRequest.create).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('unavailable'),
      expect.any(Object),
    );
  });

  it('blocks a disabled main-bot expense before account lookup or persistence', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: { findUnique: jest.fn() },
    };
    const bot = { sendMessage: jest.fn() };
    const availability = { isEnabled: jest.fn().mockResolvedValue(false) };
    const service = new TelegramBotService(
      prisma as never,
      {} as never,
      bot as never,
      {} as never,
      {} as never,
      undefined,
      availability as never,
    );
    await service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        from: { id: 123 },
        chat: { id: 123, type: 'private' },
        text: 'Lunch 4.50',
      },
    });
    expect(availability.isEnabled).toHaveBeenCalledWith('telegram:expenses');
    expect(prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('unavailable'),
    );
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalled();
  });
});
