import { ExpenseCurrency } from '@prisma/client';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

describe('Personal assistant Telegram flow', () => {
  it('routes linked private natural-language task reminders and sends the confirmation', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 100n }]),
      telegramBotUpdate: { update: jest.fn() },
      socialAccount: {
        findUnique: jest.fn().mockResolvedValue({
          user: {
            id: '00000000-0000-4000-8000-000000000001',
            isActive: true,
            telegramNotificationTimeZone: 'Asia/Phnom_Penh',
            telegramNotificationsEnabled: true,
            telegramBudgetAlertsEnabled: false,
            telegramWeeklyDigestEnabled: false,
            telegramWeeklyDigestHour: 20,
            expenseProfile: { currency: ExpenseCurrency.USD },
          },
        }),
      },
    };
    const bot = { sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }) };
    const personalAssistant = {
      handleMessage: jest.fn().mockResolvedValue({
        consumed: true,
        text: 'Got it. I’ll remind you tomorrow at 2:00 PM to buy a power bank for O Neth.',
      }),
    };
    const service = new TelegramBotService(
      prisma as never,
      { getOrThrow: jest.fn().mockReturnValue('safe-test-secret') } as never,
      bot as never,
      {} as never,
      {} as never,
      personalAssistant as never,
    );

    await service.handleUpdate({
      update_id: 100,
      message: {
        message_id: 10,
        date: 1,
        from: { id: 123 },
        chat: { id: 123, type: 'private' },
        text: 'Need to buy power bank for O Neth, remind me tomorrow at 2pm',
      },
    });

    expect(personalAssistant.handleMessage).toHaveBeenCalledWith(
      expect.stringContaining('power bank'),
      expect.objectContaining({
        userId: '00000000-0000-4000-8000-000000000001',
        timeZone: 'Asia/Phnom_Penh',
      }),
    );
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('tomorrow at 2:00 PM'),
    );
  });
});
