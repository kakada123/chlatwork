import { TelegramBotService } from './telegram-bot.service';

describe('Guided group split', () => {
  const chatId = -1001234567890;
  type Session = { amountInput: string | null; promptMessageId: number; lastMessageId: number; expiresAt: Date };

  function setup() {
    const sessions = new Map<string, Session>();
    const prisma = {
      $queryRaw: jest.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
        const query = sql.join('');
        if (query.includes('FROM telegram_quick_split_sessions')) {
          const session = sessions.get(`${values[0]}:${values[1]}`);
          return session ? [session] : [];
        }
        if (query.includes('FROM member_khqr_images')) return [{ version: 'a'.repeat(64) }];
        return [{ updateId: 1n }];
      }),
      $executeRaw: jest.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
        const query = sql.join('');
        if (query.includes('INSERT INTO telegram_quick_split_sessions')) {
          const [chat, sender, amountInput, promptMessageId, lastMessageId, expiresAt] = values;
          sessions.set(`${chat}:${sender}`, { amountInput, promptMessageId, lastMessageId, expiresAt } as Session);
        }
        if (query.includes('DELETE FROM telegram_quick_split_sessions')) {
          sessions.delete(`${values[0]}:${values[1]}`);
        }
        return 1;
      }),
      $transaction: jest.fn(),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    prisma.$transaction.mockImplementation(async (work) => {
      const snapshot = new Map(sessions);
      try { return await work(prisma); } catch (error) {
        sessions.clear();
        for (const [key, value] of snapshot) sessions.set(key, value);
        throw error;
      }
    });
    let nextPromptId = 100;
    const bot = {
      sendMessage: jest.fn(async () => ({ message_id: ++nextPromptId })),
      sendPhoto: jest.fn().mockResolvedValue({ message_id: 500 }),
      deleteMessages: jest.fn(),
    };
    const createService = (availability?: object) => new TelegramBotService(
      prisma as never, { getOrThrow: () => 'https://example.com' } as never,
      bot as never, {} as never, {} as never, undefined, availability as never,
    );
    let messageId = 0;
    const send = (service: TelegramBotService, text: string, sender = 123, chat = chatId, replyId?: number) => {
      messageId += 1;
      const answerTo = replyId ?? (!text.startsWith('/') ? sessions.get(`${chat}:${sender}`)?.promptMessageId : undefined);
      return service.handleUpdate({
        update_id: messageId,
        message: {
          message_id: messageId, chat: { id: chat, type: 'supergroup' },
          from: { id: sender, first_name: `Member ${sender}` }, text,
          ...(answerTo ? { reply_to_message: { message_id: answerTo, chat: { id: chat, type: 'supergroup' } } } : {}),
        },
      });
    };
    return { sessions, prisma, bot, createService, send };
  }

  beforeEach(() => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { headers: { 'Content-Type': 'image/png' } }));
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

  it('asks amount, then people, then sends one QR message with the result beneath it', async () => {
    const { createService, send, bot, prisma, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    expect(bot.sendMessage).toHaveBeenLastCalledWith(
      chatId, 'Please enter the amount. Example: 36000r or 10$',
      expect.objectContaining({ force_reply: true, selective: true }), undefined, 1,
    );
    expect(prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    await send(service, '36000', 123, chatId, 101);
    expect(bot.sendMessage).toHaveBeenLastCalledWith(
      chatId, 'Please enter the number of people. Example: 6',
      expect.objectContaining({ force_reply: true, selective: true }), undefined, 2,
    );
    await send(service, '6', 123, chatId, 102);
    expect(bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
    expect(bot.sendPhoto).toHaveBeenCalledWith(
      chatId, expect.stringContaining('/tg_123?'), 'Member 123 · KHQR\n\n🧾 36,000 ÷ 6\nEach: 6,000',
    );
    expect(sessions.size).toBe(0);
  });

  it.each([
    ['10', '🧾 10 ÷ 6\nEach: 1.67'],
    ['10$', '🧾 $10.00 ÷ 6\nEach: $1.67'],
    ['10000r', '🧾 10,000៛ ÷ 6\nEach: 1,667៛'],
  ])('preserves the currency choice in a guided split with %s', async (amount, result) => {
    const { createService, send, bot } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, amount);
    await send(service, '6');
    expect(bot.sendPhoto).toHaveBeenCalledWith(
      chatId, expect.stringContaining('/tg_123?'), `Member 123 · KHQR\n\n${result}`,
    );
  });

  it('isolates senders and groups and continues after a bot restart', async () => {
    const { createService, send, bot, sessions } = setup();
    let service = createService();
    await send(service, '/split', 123);
    await send(service, '/split', 456);
    await send(service, '36000', 123);
    await send(service, '12000', 456);
    await send(service, '6', 123, -200);
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBe('36000');
    service = createService();
    await send(service, '6', 123);
    await send(service, '3', 456);
    expect(bot.sendPhoto.mock.calls.map((call) => call[1])).toEqual([
      expect.stringContaining('/tg_123?'), expect.stringContaining('/tg_456?'),
    ]);
  });

  it('keeps the current step on invalid input and ignores replies to an old prompt', async () => {
    const { createService, send, bot, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, 'not an amount', 123, chatId, 101);
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBeNull();
    await send(service, '36000', 123, chatId, 102);
    await send(service, '0', 123, chatId, 103);
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBe('36000');
    await send(service, '6', 123, chatId, 103);
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    await send(service, '6', 123, chatId, 104);
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
  });

  it('supports /cancel and ignores expired conversations', async () => {
    jest.useFakeTimers();
    const { createService, send, bot, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, '/cancel');
    expect(sessions.size).toBe(0);
    expect(bot.sendMessage).toHaveBeenLastCalledWith(chatId, 'Split cancelled.');
    await send(service, '/split');
    await jest.advanceTimersByTimeAsync(10 * 60_000 + 1);
    await send(service, '36000');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBeNull();
  });

  it('honors disabled bill splitting for replies in an existing conversation', async () => {
    const { createService, send, bot, sessions } = setup();
    const availability = { isEnabled: jest.fn().mockResolvedValue(true) };
    const service = createService(availability);
    await send(service, '/split');
    availability.isEnabled.mockResolvedValue(false);
    await send(service, '36000');
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBeNull();
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it('keeps a pending calculation retryable when QR delivery fails', async () => {
    const { createService, send, bot, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, '36000');
    bot.sendPhoto.mockRejectedValueOnce(new Error('Temporary Telegram failure'));
    await expect(send(service, '6')).rejects.toThrow('Temporary Telegram failure');
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBe('36000');
    await send(service, '6');
    expect(sessions.size).toBe(0);
    expect(bot.sendPhoto).toHaveBeenCalledTimes(2);
  });

  it('ends the pending guided flow when the sender completes a one-line split instead', async () => {
    const { createService, send, bot, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, '/split 36000 / 6');
    expect(sessions.size).toBe(0);
    bot.sendMessage.mockClear();
    await send(service, '6000');
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it('does not consume unrelated numbers outside replies to its prompt', async () => {
    const { createService, send, bot, sessions } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, '36000');
    await send(service, '6', 123, chatId, 0);
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(sessions.get(`${chatId}:123`)?.amountInput).toBe('36000');
  });

  it('does not replay a delivered shortcut when old-session cleanup fails', async () => {
    const { createService, send, bot, prisma } = setup();
    const execute = prisma.$executeRaw.getMockImplementation()!;
    prisma.$executeRaw.mockImplementation(async (sql, ...values) => {
      if (sql.join('').includes('DELETE FROM telegram_quick_split_sessions')) {
        throw new Error('Session cleanup unavailable');
      }
      return execute(sql, ...values);
    });
    await expect(send(createService(), '/split 36000 / 6')).resolves.toBeUndefined();
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
    expect(prisma.telegramBotUpdate.deleteMany).not.toHaveBeenCalled();
  });

  it('resolves session cleanup failures before delivering a guided result', async () => {
    const { createService, send, bot, prisma } = setup();
    const service = createService();
    await send(service, '/split');
    await send(service, '36000');
    const execute = prisma.$executeRaw.getMockImplementation()!;
    let failCleanup = true;
    prisma.$executeRaw.mockImplementation(async (sql, ...values) => {
      if (failCleanup && sql.join('').includes('DELETE FROM telegram_quick_split_sessions')) {
        failCleanup = false;
        throw new Error('Session cleanup unavailable');
      }
      return execute(sql, ...values);
    });
    await expect(send(service, '6')).rejects.toThrow('Session cleanup unavailable');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    await send(service, '6');
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
  });
});
