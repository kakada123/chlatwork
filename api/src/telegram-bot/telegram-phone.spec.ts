import { TelegramBotService } from './telegram-bot.service';

function setup() {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
    $executeRaw: jest.fn(),
    telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
    socialAccount: {
      findUnique: jest.fn().mockResolvedValue({ user: { id: 'account-123', isActive: true } }),
    },
    user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const bot = { sendMessage: jest.fn(), setChatMenuButton: jest.fn() };
  const service = new TelegramBotService(
    prisma as never,
    { getOrThrow: () => 'https://example.com' } as never,
    bot as never,
    {} as never,
    {} as never,
  );
  const message = {
    message_id: 10,
    chat: { id: 123, type: 'private' },
    from: { id: 123 },
    contact: { user_id: 123, phone_number: '85512345678', first_name: 'Test' },
  };
  return { prisma, bot, service, message };
}

describe('optional Telegram phone sharing', () => {
  it('does not ask for a phone on normal start', async () => {
    const { service, bot, message } = setup();
    await service.handleUpdate({ update_id: 1, message: { ...message, contact: undefined, text: '/start' } });
    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage.mock.calls[0][2]).toHaveProperty('inline_keyboard');
  });

  it('requests contact only when explicitly asked', async () => {
    const { service, bot, message } = setup();
    await service.handleUpdate({ update_id: 1, message: { ...message, contact: undefined, text: '/phone' } });
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.any(String), expect.objectContaining({
      keyboard: [[{ text: '📱 Share Phone Number', request_contact: true }], [{ text: '/skipphone' }]],
    }));
  });

  it.each(['85512345678', '+85512345678'])('saves an own contact using the active numeric Telegram link: %s', async (phone) => {
    const { service, bot, prisma, message } = setup();
    message.contact.phone_number = phone;
    await service.handleUpdate({ update_id: 1, message });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'account-123', isActive: true,
        socialAccounts: { some: { provider: 'TELEGRAM', providerUserId: '123' } },
      },
      data: { phone: '+85512345678' },
    });
    expect(bot.sendMessage).toHaveBeenCalledWith(123, expect.stringContaining('has been saved'), { remove_keyboard: true });
    expect(JSON.stringify(bot.sendMessage.mock.calls)).not.toContain('85512345678');
  });

  it.each([456, undefined, '123'])('rejects mismatched or missing contact ownership: %s', async (userId) => {
    const { service, prisma, message } = setup();
    await service.handleUpdate({ update_id: 1, message: { ...message, contact: { ...message.contact, user_id: userId } } });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it.each(['', '012345678', '+855abc123', '+123', '1'.repeat(16), 85512345678])('rejects invalid phone data: %s', async (phone) => {
    const { service, prisma, message } = setup();
    await service.handleUpdate({ update_id: 1, message: { ...message, contact: { ...message.contact, phone_number: phone } } });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it.each([null, { user: { id: 'account-123', isActive: false } }])('does not save for an unavailable account', async (linked) => {
    const { service, prisma, message } = setup();
    prisma.socialAccount.findUnique.mockResolvedValue(linked as never);
    await service.handleUpdate({ update_id: 1, message });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('ignores contacts in groups', async () => {
    const { service, prisma, message } = setup();
    await service.handleUpdate({ update_id: 1, message: { ...message, chat: { id: -100, type: 'supergroup' } } });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('does not report success after a link or account becomes unavailable', async () => {
    const { service, prisma, bot, message } = setup();
    prisma.user.updateMany.mockResolvedValue({ count: 0 });
    await service.handleUpdate({ update_id: 1, message });
    expect(JSON.stringify(bot.sendMessage.mock.calls)).not.toContain('has been saved');
  });

  it('sanitizes database failures and allows Telegram to retry', async () => {
    const { service, prisma, message } = setup();
    prisma.user.updateMany.mockRejectedValue(new Error('query phone=85512345678'));
    await expect(service.handleUpdate({ update_id: 1, message })).rejects.toThrow('Phone number could not be saved');
    expect(prisma.telegramBotUpdate.deleteMany).toHaveBeenCalled();
  });
});
