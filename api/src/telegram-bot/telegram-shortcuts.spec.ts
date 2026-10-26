import { TelegramBotService } from './telegram-bot.service';

function setup(disabled: string[] = []) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
    $executeRaw: jest.fn(),
    telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
    socialAccount: {
      findUnique: jest.fn().mockResolvedValue({
        user: { id: 'owner', isActive: true },
      }),
    },
    expenseEntry: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const bot = { sendMessage: jest.fn(), setChatMenuButton: jest.fn() };
  const ai = { parseExpense: jest.fn() };
  const availability = {
    disabledKeys: jest.fn().mockResolvedValue(disabled),
    isEnabled: jest.fn(async (key: string) => !disabled.includes(key)),
  };
  const moments = {
    listTelegramVotingMoments: jest.fn().mockResolvedValue([]),
  };
  const service = new TelegramBotService(
    prisma as never,
    { getOrThrow: () => 'https://example.test' } as never,
    bot as never,
    moments as never,
    ai as never,
    undefined,
    availability as never,
  );
  const send = (text: string) =>
    service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        from: { id: 123 },
        chat: { id: 123, type: 'private' },
        text,
      },
    });
  return { prisma, bot, ai, moments, service, send };
}

describe('ChlatWork fixed Telegram shortcuts', () => {
  it.each(['/start', '/menu', '☰ Menu'])(
    'installs a persistent shortcut keyboard alongside the existing menu for %s',
    async (command) => {
      const test = setup();
      await test.send(command);
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.any(String),
        expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      );
      expect(test.bot.sendMessage).toHaveBeenLastCalledWith(
        123,
        expect.any(String),
        {
          keyboard: [
            [{ text: '➕ Add expense' }, { text: '📊 Today' }],
            [{ text: '🕘 Recent' }, { text: '💬 Ask spending' }],
            [{ text: '🗳 Share a vote' }, { text: '☰ Menu' }],
          ],
          is_persistent: true,
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      );
      expect(test.ai.parseExpense).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['➕ Add expense', 'Send one expense like:'],
    ['💬 Ask spending', 'Ask a spending question'],
  ])(
    'routes %s to instructions without parsing or saving an expense',
    async (text, prompt) => {
      const test = setup();
      await test.send(text);
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining(prompt),
      );
      expect(test.ai.parseExpense).not.toHaveBeenCalled();
      expect(test.prisma.expenseEntry.findMany).not.toHaveBeenCalled();
    },
  );

  it.each(['🕘 Recent', '📊 Today'])(
    'uses the linked account for %s',
    async (text) => {
      const test = setup();
      await test.send(text);
      expect(test.prisma.expenseEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'owner' }),
        }),
      );
      expect(test.ai.parseExpense).not.toHaveBeenCalled();
    },
  );

  it('lists the linked account’s voting moments from the vote shortcut', async () => {
    const test = setup();
    await test.send('🗳 Share a vote');
    expect(test.moments.listTelegramVotingMoments).toHaveBeenCalledWith(
      'owner',
    );
    expect(test.ai.parseExpense).not.toHaveBeenCalled();
  });

  it('does not install or process private shortcuts in a group', async () => {
    const test = setup();
    await test.service.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        chat: { id: -100, type: 'supergroup' },
        from: { id: 123 },
        text: '☰ Menu',
      },
    });
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    expect(test.ai.parseExpense).not.toHaveBeenCalled();
  });

  it('does not install tool shortcuts for an unlinked account', async () => {
    const test = setup();
    test.prisma.socialAccount.findUnique.mockResolvedValue(null as never);
    await test.send('/menu');
    expect(test.bot.sendMessage).toHaveBeenLastCalledWith(
      123,
      expect.any(String),
      {
        keyboard: [[{ text: '☰ Menu' }]],
        is_persistent: true,
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    );
  });

  it.each([
    ['➕ Add expense', 'telegram:expenses'],
    ['📊 Today', 'telegram:spending'],
    ['🕘 Recent', 'telegram:spending'],
    ['💬 Ask spending', 'telegram:spending'],
    ['🗳 Share a vote', 'telegram:voting'],
  ])(
    'blocks the stale %s shortcut when its feature is disabled',
    async (text, feature) => {
      const test = setup([feature]);
      await test.send(text);
      expect(test.bot.sendMessage).toHaveBeenCalledWith(
        123,
        expect.stringContaining('unavailable'),
      );
      expect(test.prisma.socialAccount.findUnique).not.toHaveBeenCalled();
      expect(test.ai.parseExpense).not.toHaveBeenCalled();
    },
  );

  it('hides disabled shortcuts while keeping Menu available', async () => {
    const test = setup([
      'telegram:expenses',
      'telegram:spending',
      'telegram:voting',
    ]);
    await test.send('/menu');
    expect(test.bot.sendMessage).toHaveBeenLastCalledWith(
      123,
      expect.any(String),
      {
        keyboard: [[{ text: '☰ Menu' }]],
        is_persistent: true,
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    );
  });

  it('keeps unlinked users on the account connection flow', async () => {
    const test = setup();
    test.prisma.socialAccount.findUnique.mockResolvedValue(null as never);
    await test.send('➕ Add expense');
    expect(test.bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('sign in'),
      expect.objectContaining({ inline_keyboard: expect.any(Array) }),
    );
    expect(test.ai.parseExpense).not.toHaveBeenCalled();
  });
});
