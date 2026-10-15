import { AiFeature } from '@prisma/client';
import { CreatorTelegramService } from './creator-telegram.service';
import { CreatorTelegramController } from './creator-telegram.controller';
import { CreatorTelegramClient } from './creator-telegram.client';

function setup() {
  const requests: any[] = [];
  const welcomeUpdates = new Map<bigint, bigint>();
  const prisma = {
    $executeRaw: jest.fn(),
    $transaction: jest.fn(),
    socialAccount: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ user: { id: 'owner', isActive: true } }),
    },
    creatorTelegramChat: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn(async ({ where }) => ({
        welcomeUpdateId: welcomeUpdates.get(where.telegramUserId) ?? -1n,
      })),
      createMany: jest.fn(),
      updateMany: jest.fn(async ({ where, data }) => {
        if ('welcomeUpdateId' in data) {
          const current = welcomeUpdates.get(where.telegramUserId) ?? -1n;
          const expected = where.welcomeUpdateId;
          if (
            typeof expected === 'bigint'
              ? current !== expected
              : current >= expected.lt
          )
            return { count: 0 };
          welcomeUpdates.set(where.telegramUserId, data.welcomeUpdateId);
        }
        return { count: 1 };
      }),
    },
    creatorTelegramRequest: {
      findUnique: jest.fn(async ({ where }) =>
        requests.find((job) => job.updateId === where.updateId),
      ),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async ({ data }) => {
        requests.push(data);
        return data;
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const job = requests.find(
          (request) =>
            request.updateId === where.updateId &&
            request.leaseId === where.leaseId,
        );
        if (!job) return { count: 0 };
        Object.assign(job, data);
        return { count: 1 };
      }),
    },
  };
  prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
  const values: Record<string, string> = {
    CREATOR_TELEGRAM_BOT_TOKEN: '987654321:test-creator-token',
    CREATOR_TELEGRAM_WEBHOOK_SECRET: 'test_creator_webhook',
    FRONTEND_ORIGIN: 'https://creator.example.com',
    TELEGRAM_BOT_TOKEN: '123456789:test-main-token',
  };
  const config = {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => values[key]),
  };
  const bot = {
    getIdentity: jest.fn().mockResolvedValue({
      id: 987654321,
      is_bot: true,
      username: 'cw_creator_bot',
    }),
    sendMessage: jest.fn(),
    sendChatAction: jest.fn(),
    sendStatus: jest.fn().mockResolvedValue(55),
    clearStatus: jest.fn(),
    editMessage: jest.fn(),
    answerCallback: jest.fn(),
    setChatMenuButton: jest.fn(),
  };
  const credits = { getBalance: jest.fn().mockResolvedValue({ balance: 25 }) };
  const plans = {
    dailyUsage: jest
      .fn()
      .mockResolvedValue({ used: 10, limit: 30, remaining: 20 }),
  };
  const service = new CreatorTelegramService(
    prisma as never,
    config as never,
    bot as never,
    credits as never,
    plans as never,
    { fixed: () => 1 } as never,
  );
  const message = (text: string, updateId = 1) => ({
    update_id: updateId,
    message: {
      message_id: 10,
      from: { id: 123 },
      chat: { id: 123, type: 'private' },
      text,
    },
  });
  return {
    service,
    prisma,
    bot,
    credits,
    plans,
    requests,
    message,
    values,
    config,
  };
}

describe('Creator Telegram bot', () => {
  const groupMessage = (text: string, userId = 123, updateId = 1) => ({
    update_id: updateId,
    message: {
      message_id: 10,
      from: { id: userId },
      chat: { id: -100123, type: 'supergroup' },
      text,
    },
  });

  it('queues group commands under the sender account and keeps the group as the destination', async () => {
    const test = setup();
    await test.service.handleUpdate(groupMessage('/latin nh jol jit'));
    expect(test.requests[0]).toMatchObject({
      userId: 'owner',
      telegramUserId: 123n,
      chatId: -100123n,
      sourceMessageId: 10,
      feature: AiFeature.LATIN_TO_KHMER,
      content: 'nh jol jit',
    });
    expect(test.prisma.socialAccount.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_providerUserId: {
            provider: 'TELEGRAM',
            providerUserId: '123',
          },
        },
      }),
    );
  });

  it('ignores ambient group text and commands addressed to another bot', async () => {
    const test = setup();
    await test.service.handleUpdate(
      groupMessage('ordinary group conversation'),
    );
    await test.service.handleUpdate(
      groupMessage('/latin@another_bot hello', 123, 2),
    );
    expect(test.requests).toHaveLength(0);
    expect(test.prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('accepts addressed commands and replies to this bot using the replying member’s mode', async () => {
    const test = setup();
    test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({
      feature: AiFeature.KHMER_TO_ENGLISH,
    });
    await test.service.handleUpdate(
      groupMessage('/latin@cw_creator_bot hello'),
    );
    const update = groupMessage('សួស្តី', 456, 2);
    await test.service.handleUpdate({
      ...update,
      message: {
        ...update.message,
        reply_to_message: {
          message_id: 9,
          from: { id: 987654321, is_bot: true },
          chat: update.message.chat,
        },
      },
    });
    expect(test.requests).toHaveLength(2);
    expect(test.requests[1]).toMatchObject({
      telegramUserId: 456n,
      feature: AiFeature.KHMER_TO_ENGLISH,
    });
  });

  it('uses normal URL buttons and sender-owned mode preferences for group menus', async () => {
    const test = setup();
    await test.service.handleUpdate(groupMessage('/latin'));
    const [menu, prompt] = test.bot.sendMessage.mock.calls;
    expect(menu[0]).toBe(-100123);
    expect(
      menu[2].inline_keyboard.flat().some((button: any) => button.web_app),
    ).toBe(false);
    expect(menu[2].inline_keyboard.flat()).toContainEqual({
      text: '✨ Open Creator / Sign in',
      url: 'https://creator.example.com/creator',
    });
    expect(prompt[1]).toContain('Reply');
    expect(test.prisma.creatorTelegramChat.updateMany).toHaveBeenCalledWith({
      where: { telegramUserId: 123n, lastUpdateId: { lt: 1n } },
      data: { feature: AiFeature.LATIN_TO_KHMER, lastUpdateId: 1n },
    });
  });

  it('keeps group members’ accounts and selected modes independent', async () => {
    const test = setup();
    test.prisma.socialAccount.findUnique.mockImplementation(
      async ({ where }) => ({
        user: {
          id: `account-${where.provider_providerUserId.providerUserId}`,
          isActive: true,
        },
      }),
    );
    test.prisma.creatorTelegramChat.findUnique.mockImplementation(
      async ({ where }) => ({
        feature:
          where.telegramUserId === 123n
            ? AiFeature.LATIN_TO_KHMER
            : AiFeature.HUMANIZE,
      }),
    );
    for (const [sender, updateId] of [
      [123, 1],
      [456, 2],
    ]) {
      const update = groupMessage('convert my text', sender, updateId);
      await test.service.handleUpdate({
        ...update,
        message: {
          ...update.message,
          message_thread_id: 77,
          reply_to_message: {
            message_id: 9,
            from: { id: 987654321, is_bot: true },
            chat: update.message.chat,
          },
        },
      });
    }
    expect(test.requests).toEqual([
      expect.objectContaining({
        userId: 'account-123',
        telegramUserId: 123n,
        feature: AiFeature.LATIN_TO_KHMER,
        messageThreadId: 77,
      }),
      expect.objectContaining({
        userId: 'account-456',
        telegramUserId: 456n,
        feature: AiFeature.HUMANIZE,
        messageThreadId: 77,
      }),
    ]);
  });

  it('rejects anonymous group senders, channels, and replies addressed to other participants', async () => {
    const test = setup();
    const update = groupMessage('/latin hello');
    await test.service.handleUpdate({
      ...update,
      message: { ...update.message, sender_chat: update.message.chat },
    });
    await test.service.handleUpdate({
      ...update,
      message: { ...update.message, chat: { id: -100123, type: 'channel' } },
    });
    for (const from of [
      { id: 456, is_bot: false },
      { id: 999, is_bot: true },
    ]) {
      await test.service.handleUpdate({
        ...update,
        message: {
          ...update.message,
          text: 'not for Creator',
          reply_to_message: { message_id: 3, from, chat: update.message.chat },
        },
      });
    }
    expect(test.requests).toHaveLength(0);
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.prisma.socialAccount.findUnique).not.toHaveBeenCalled();
  });

  it('opens a group welcome without private-only menu API calls', async () => {
    const test = setup();
    await test.service.handleUpdate(groupMessage('/start'));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(test.bot.setChatMenuButton).not.toHaveBeenCalled();
    expect(test.prisma.creatorTelegramChat.createMany).toHaveBeenCalledWith({
      data: [{ telegramUserId: 123n }],
      skipDuplicates: true,
    });
  });

  it('a group mode button updates only the member who clicked it', async () => {
    const test = setup();
    await test.service.handleUpdate({
      update_id: 3,
      callback_query: {
        id: 'group-mode',
        from: { id: 456 },
        data: 'mode:latin',
        message: {
          message_id: 7,
          from: { id: 987654321, is_bot: true },
          chat: { id: -100123, type: 'group' },
        },
      },
    });
    expect(test.prisma.creatorTelegramChat.updateMany).toHaveBeenCalledWith({
      where: { telegramUserId: 456n, lastUpdateId: { lt: 3n } },
      data: { feature: AiFeature.LATIN_TO_KHMER, lastUpdateId: 3n },
    });
    expect(test.bot.sendMessage.mock.calls[0][0]).toBe(-100123);
    expect(test.requests).toHaveLength(0);
  });

  it.each(['credits', 'settings'])(
    'keeps /%s personal information out of group replies',
    async (command) => {
      const test = setup();
      await test.service.handleUpdate(groupMessage(`/${command}`));
      expect(test.bot.sendMessage.mock.calls[0][1]).toContain('private chat');
      expect(test.credits.getBalance).not.toHaveBeenCalled();
      expect(test.plans.dailyUsage).not.toHaveBeenCalled();
      expect(test.requests).toHaveLength(0);
    },
  );

  it.each(['credits', 'settings', 'unlinked', 'full', 'oversized'])(
    'keeps %s feedback in the requesting forum topic',
    async (scenario) => {
      const test = setup();
      if (scenario === 'unlinked')
        test.prisma.socialAccount.findUnique.mockResolvedValue(null);
      if (scenario === 'full')
        test.prisma.creatorTelegramRequest.count.mockResolvedValue(3);
      const text = ['credits', 'settings'].includes(scenario)
        ? `/${scenario}`
        : `/latin ${scenario === 'oversized' ? 'x'.repeat(4001) : 'hello'}`;
      const update = groupMessage(text);
      await test.service.handleUpdate({
        ...update,
        message: { ...update.message, message_thread_id: 77 },
      });
      expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
      const reply = test.bot.sendMessage.mock.calls[0];
      expect(reply[0]).toBe(-100123);
      expect(reply.slice(4)).toEqual([10, { messageThreadId: 77 }]);
      expect(test.requests).toHaveLength(0);
    },
  );

  it('rejects absent, wrong, and main-bot webhook secrets before processing', async () => {
    const test = setup();
    const controller = new CreatorTelegramController(test.service);
    for (const secret of [undefined, 'wrong-secret', 'test-main-webhook'])
      await expect(
        controller.receiveUpdate(secret, test.message('hello')),
      ).rejects.toMatchObject({ status: 401 });
    expect(test.prisma.creatorTelegramRequest.create).not.toHaveBeenCalled();
    expect(test.service.isValidWebhookSecret('test_creator_webhook')).toBe(
      true,
    );
    delete test.values.CREATOR_TELEGRAM_BOT_TOKEN;
    expect(test.service.isValidWebhookSecret('test_creator_webhook')).toBe(
      false,
    );
  });

  it('queues one immutable request per Telegram update and defaults to Khmer grammar', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('សួស្តី'));
    await test.service.handleUpdate(test.message('changed retry'));
    expect(test.requests).toEqual([
      {
        updateId: 1n,
        userId: 'owner',
        chatId: 123n,
        telegramUserId: 123n,
        feature: AiFeature.KHMER_GRAMMAR,
        content: 'សួស្តី',
        statusMessageId: 55,
        leaseId: null,
        lockedUntil: null,
      },
    ]);
    expect(test.bot.sendStatus).toHaveBeenCalledTimes(1);
    expect(test.bot.sendStatus).toHaveBeenCalledWith(
      123,
      expect.stringContaining('queued'),
    );
    expect(test.credits.getBalance).not.toHaveBeenCalled();
  });

  it('holds the worker lease until the acknowledgement is saved', async () => {
    const test = setup();
    test.bot.sendStatus.mockImplementationOnce(async () => {
      expect(test.requests[0]).toMatchObject({
        leaseId: expect.any(String),
        lockedUntil: expect.any(Date),
      });
      expect(test.requests[0].lockedUntil.getTime()).toBeGreaterThan(
        Date.now(),
      );
      return 55;
    });
    await test.service.handleUpdate(test.message('hello'));
    expect(test.requests[0]).toMatchObject({
      statusMessageId: 55,
      leaseId: null,
      lockedUntil: null,
    });
  });

  it('still releases queued work if Telegram cannot acknowledge it', async () => {
    const test = setup();
    test.bot.sendStatus.mockResolvedValueOnce(null);
    await test.service.handleUpdate(test.message('hello'));
    expect(test.requests[0]).toMatchObject({
      statusMessageId: null,
      leaseId: null,
      lockedUntil: null,
    });
  });

  it('removes an acknowledgement if saving it fails without duplicating queued work', async () => {
    const test = setup();
    test.prisma.creatorTelegramRequest.updateMany.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(
      test.service.handleUpdate(test.message('hello')),
    ).rejects.toThrow('Database unavailable');
    expect(test.bot.clearStatus).toHaveBeenCalledWith(
      123,
      55,
      expect.any(String),
    );
    await test.service.handleUpdate(test.message('hello'));
    expect(test.requests).toHaveLength(1);
    expect(test.bot.sendStatus).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['grammar', AiFeature.KHMER_GRAMMAR],
    ['rewrite', AiFeature.KHMER_REWRITE],
    ['latin', AiFeature.LATIN_TO_KHMER],
    ['khmer_to_latin', AiFeature.KHMER_TO_LATIN],
    ['khmer_to_english', AiFeature.KHMER_TO_ENGLISH],
    ['latin_to_english', AiFeature.LATIN_TO_ENGLISH],
    ['english_to_latin', AiFeature.ENGLISH_TO_LATIN],
    ['humanize', AiFeature.HUMANIZE],
  ])(
    'maps /%s with text to the existing Creator feature',
    async (command, feature) => {
      const test = setup();
      await test.service.handleUpdate(test.message(`/${command} example text`));
      expect(test.requests[0]).toMatchObject({
        feature,
        content: 'example text',
      });
    },
  );

  it('mode buttons persist only newer choices without generating or charging', async () => {
    const test = setup();
    await test.service.handleUpdate({
      update_id: 7,
      callback_query: {
        id: 'callback',
        from: { id: 123 },
        message: { message_id: 1, chat: { id: 123, type: 'private' } },
        data: 'mode:rewrite',
      },
    });
    expect(test.prisma.creatorTelegramChat.updateMany).toHaveBeenCalledWith({
      where: { telegramUserId: 123n, lastUpdateId: { lt: 7n } },
      data: { feature: AiFeature.KHMER_REWRITE, lastUpdateId: 7n },
    });
    expect(test.requests).toHaveLength(0);
    expect(test.bot.sendMessage.mock.calls[0][1]).toContain('1 credit(s)');
    expect(test.bot.sendMessage.mock.calls[0][2]).toHaveProperty(
      'inline_keyboard',
    );
    expect(test.bot.sendMessage.mock.calls[1][2]).toBeUndefined();
  });

  it.each([
    'grammar',
    'rewrite',
    'latin',
    'humanize',
    'khmer_to_latin',
    'khmer_to_english',
    'latin_to_english',
    'english_to_latin',
    'start',
    'help',
    'menu',
    'creator',
    'khmer',
    'unknown',
  ])('puts the menu above the input prompt for /%s', async (command) => {
    const test = setup();
    await test.service.handleUpdate(test.message(`/${command}`));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(2);
    const [menu, prompt] = test.bot.sendMessage.mock.calls;
    expect(menu[0]).toBe(123);
    expect(menu[2].inline_keyboard.flat()).toContainEqual(
      expect.objectContaining({ callback_data: 'mode:latin' }),
    );
    expect(menu[1]).not.toContain('ផ្ញើអត្ថបទនៅទីនេះ');
    expect(prompt[0]).toBe(123);
    expect(prompt[1]).toBe('ផ្ញើអត្ថបទនៅទីនេះ។ / Send your text here.');
    expect(prompt[2]).toBeUndefined();
    expect(test.requests).toHaveLength(0);
    expect(test.credits.getBalance).not.toHaveBeenCalled();
  });

  it('waits for the menu to finish sending before sending the input prompt', async () => {
    const test = setup();
    let started!: () => void;
    let complete!: () => void;
    const sending = new Promise<void>((resolve) => {
      started = resolve;
    });
    test.bot.sendMessage.mockImplementationOnce(() => {
      started();
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    const response = test.service.handleUpdate(test.message('/latin'));
    await sending;
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(test.bot.sendMessage.mock.calls[0][2]).toHaveProperty(
      'inline_keyboard',
    );
    complete();
    await response;
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(test.bot.sendMessage.mock.calls[1][2]).toBeUndefined();
  });

  it.each([
    ['khmer_to_latin', AiFeature.KHMER_TO_LATIN],
    ['khmer_to_english', AiFeature.KHMER_TO_ENGLISH],
    ['latin_to_english', AiFeature.LATIN_TO_ENGLISH],
    ['english_to_latin', AiFeature.ENGLISH_TO_LATIN],
  ])(
    'selects %s from a menu button before accepting text',
    async (command, feature) => {
      const test = setup();
      await test.service.handleUpdate({
        update_id: 8,
        callback_query: {
          id: 'translation-mode',
          from: { id: 123 },
          message: { message_id: 1, chat: { id: 123, type: 'private' } },
          data: `mode:${command}`,
        },
      });
      expect(test.prisma.creatorTelegramChat.updateMany).toHaveBeenCalledWith({
        where: { telegramUserId: 123n, lastUpdateId: { lt: 8n } },
        data: { feature, lastUpdateId: 8n },
      });
      expect(test.requests).toHaveLength(0);
      test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({ feature });
      await test.service.handleUpdate(test.message('text to convert', 9));
      expect(test.requests[0]).toMatchObject({
        feature,
        content: 'text to convert',
      });
    },
  );

  it('uses a saved mode for subsequent plain text', async () => {
    const test = setup();
    test.prisma.creatorTelegramChat.findUnique.mockResolvedValue({
      feature: AiFeature.HUMANIZE,
    });
    await test.service.handleUpdate(test.message('make this natural'));
    expect(test.requests[0].feature).toBe(AiFeature.HUMANIZE);
  });

  it('requires an active linked account before queuing or exposing credits', async () => {
    const test = setup();
    for (const linked of [null, { user: { id: 'owner', isActive: false } }]) {
      test.prisma.socialAccount.findUnique.mockResolvedValue(linked);
      await test.service.handleUpdate(test.message('/credits'));
      await test.service.handleUpdate(test.message('hello'));
    }
    expect(test.credits.getBalance).not.toHaveBeenCalled();
    expect(test.requests).toHaveLength(0);
    expect(test.bot.sendMessage.mock.calls[0][1]).toContain(
      'Open Creator once',
    );
  });

  it('ignores invalid group chat IDs, bot senders, and mismatched private-chat owners', async () => {
    const test = setup();
    for (const override of [
      { chat: { id: 123, type: 'group' } },
      { from: { id: 123, is_bot: true } },
      { from: { id: 456 } },
      { from: { id: 1.5 } },
    ]) {
      const update = test.message('hello');
      await test.service.handleUpdate({
        ...update,
        message: { ...update.message, ...override },
      });
    }
    expect(test.prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
  });

  it('bounds text and per-account queued work', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('x'.repeat(4001)));
    expect(test.requests).toHaveLength(0);
    test.prisma.creatorTelegramRequest.count.mockResolvedValue(3);
    await test.service.handleUpdate(test.message('hello'));
    expect(test.requests).toHaveLength(0);
    expect(test.bot.sendMessage.mock.calls[1][1]).toContain('earlier requests');
  });

  it('reports the same wallet and daily allowance as Creator', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('/credits'));
    expect(test.bot.sendMessage.mock.calls[0][1]).toContain(
      'Daily usage: 10 / 30',
    );
    expect(test.credits.getBalance).toHaveBeenCalledWith('owner');
  });

  it('opens personal settings with both sections on by default without queuing work', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('/settings'));
    const [chatId, text, keyboard] = test.bot.sendMessage.mock.calls[0];
    expect(chatId).toBe(123);
    expect(text).toContain('Hiding credits does not change charges');
    expect(keyboard.inline_keyboard.flat()).toEqual([
      { text: '✅ ON · What changed', callback_data: 'settings:corrections:0' },
      { text: '✅ ON · Credits used', callback_data: 'settings:credits:0' },
    ]);
    expect(test.requests).toHaveLength(0);
    expect(test.credits.getBalance).not.toHaveBeenCalled();
  });

  it('sets each personal option explicitly and ignores duplicate or older callbacks independently', async () => {
    const test = setup();
    const preferences = new Map<bigint, any>();
    test.prisma.creatorTelegramChat.createMany.mockImplementation(
      async ({ data }) => {
        const id = data[0].telegramUserId;
        if (!preferences.has(id))
          preferences.set(id, {
            showCorrections: true,
            showCredits: true,
            correctionsUpdateId: -1n,
            creditsUpdateId: -1n,
          });
      },
    );
    test.prisma.creatorTelegramChat.findUnique.mockImplementation(
      async ({ where }) => preferences.get(where.telegramUserId) ?? null,
    );
    test.prisma.creatorTelegramChat.updateMany.mockImplementation(
      async ({ where, data }) => {
        const preference = preferences.get(where.telegramUserId);
        const cursor =
          'correctionsUpdateId' in data
            ? 'correctionsUpdateId'
            : 'creditsUpdateId';
        if (preference[cursor] >= where[cursor].lt) return { count: 0 };
        Object.assign(preference, data);
        return { count: 1 };
      },
    );
    const toggle = (data: string, updateId: number, userId = 123) =>
      test.service.handleUpdate({
        update_id: updateId,
        callback_query: {
          id: `callback-${updateId}`,
          from: { id: userId },
          message: { message_id: 22, chat: { id: userId, type: 'private' } },
          data,
        },
      });
    await toggle('settings:corrections:0', 20);
    await toggle('settings:corrections:1', 21);
    await toggle('settings:corrections:0', 20);
    await toggle('settings:credits:0', 19);
    await toggle('settings:credits:0', 19);
    expect(preferences.get(123n)).toMatchObject({
      showCorrections: true,
      showCredits: false,
      correctionsUpdateId: 21n,
      creditsUpdateId: 19n,
    });
    expect(test.prisma.creatorTelegramChat.updateMany).toHaveBeenCalledWith({
      where: { telegramUserId: 123n, creditsUpdateId: { lt: 19n } },
      data: { showCredits: false, creditsUpdateId: 19n },
    });
    expect(test.bot.editMessage).toHaveBeenLastCalledWith(
      123,
      22,
      expect.any(String),
      {
        inline_keyboard: [
          [
            {
              text: '✅ ON · What changed',
              callback_data: 'settings:corrections:0',
            },
          ],
          [
            {
              text: '❌ OFF · Credits used',
              callback_data: 'settings:credits:1',
            },
          ],
        ],
      },
    );
    await toggle('settings:corrections:0', 30, 456);
    expect(preferences.get(123n).showCorrections).toBe(true);
    expect(preferences.get(456n)).toMatchObject({
      showCorrections: false,
      showCredits: true,
    });
    expect(test.bot.sendMessage).not.toHaveBeenCalled();
    expect(test.requests).toHaveLength(0);
  });

  it('ignores malformed settings and settings callbacks from groups', async () => {
    const test = setup();
    for (const [data, type] of [
      ['settings:credits:toggle', 'private'],
      ['settings:credits:0', 'group'],
    ]) {
      await test.service.handleUpdate({
        update_id: 5,
        callback_query: {
          id: 'callback',
          from: { id: 123 },
          message: { message_id: 22, chat: { id: 123, type } },
          data,
        },
      });
    }
    expect(test.prisma.creatorTelegramChat.updateMany).not.toHaveBeenCalled();
    expect(test.bot.editMessage).not.toHaveBeenCalled();
    expect(test.requests).toHaveLength(0);
  });

  it('provides only Khmer AI modes and Creator links', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('/start'));
    expect(test.bot.setChatMenuButton).toHaveBeenCalledWith(
      123,
      'Open Creator',
      'https://creator.example.com/creator',
    );
    const buttons = test.service.keyboard().inline_keyboard.flat();
    expect(
      buttons.filter((button) => button.callback_data?.startsWith('mode:')),
    ).toHaveLength(8);
    for (const command of [
      'khmer_to_latin',
      'khmer_to_english',
      'latin_to_english',
      'english_to_latin',
    ]) {
      expect(buttons).toContainEqual(
        expect.objectContaining({ callback_data: `mode:${command}` }),
      );
    }
    expect(buttons).toContainEqual({
      text: '⚙️ Settings',
      callback_data: 'settings:view',
    });
    expect(
      buttons
        .filter((button) => button.web_app)
        .every((button) =>
          button.web_app!.url.startsWith('https://creator.example.com/creator'),
        ),
    ).toBe(true);
    expect(test.requests).toHaveLength(0);
  });

  it('sends one welcome for duplicate and older Start updates but allows a new Start', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('/start', 10));
    await test.service.handleUpdate(test.message('/start', 10));
    await test.service.handleUpdate(test.message('/start', 9));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(2);
    expect(test.bot.setChatMenuButton).toHaveBeenCalledTimes(1);
    await test.service.handleUpdate(test.message('/start creator', 11));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(4);
    expect(test.requests).toHaveLength(0);
  });

  it('deduplicates an overlapping Start while Telegram is still sending the first welcome', async () => {
    const test = setup();
    let sending!: () => void;
    const started = new Promise<void>((resolve) => {
      sending = resolve;
    });
    let complete!: () => void;
    test.bot.sendMessage.mockImplementationOnce(() => {
      sending();
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    });
    const first = test.service.handleUpdate(test.message('/start', 10));
    await started;
    await test.service.handleUpdate(test.message('/start', 10));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(1);
    complete();
    await first;
  });

  it('allows a failed welcome to retry but does not resend after menu-button failure', async () => {
    const test = setup();
    test.bot.sendMessage.mockRejectedValueOnce(new Error('Send failed'));
    await expect(
      test.service.handleUpdate(test.message('/start')),
    ).rejects.toThrow('Send failed');
    test.bot.setChatMenuButton.mockRejectedValueOnce(
      new Error('Menu unavailable'),
    );
    await test.service.handleUpdate(test.message('/start'));
    await test.service.handleUpdate(test.message('/start'));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(3);
    expect(test.bot.setChatMenuButton).toHaveBeenCalledTimes(1);
  });

  it('does not roll back a newer Start when an older welcome fails', async () => {
    const test = setup();
    let sending!: () => void;
    const started = new Promise<void>((resolve) => {
      sending = resolve;
    });
    let fail!: (error: Error) => void;
    test.bot.sendMessage.mockImplementationOnce(() => {
      sending();
      return new Promise<void>((_resolve, reject) => {
        fail = reject;
      });
    });
    const first = test.service.handleUpdate(test.message('/start', 10));
    const rejected = expect(first).rejects.toThrow('Old welcome failed');
    await started;
    await test.service.handleUpdate(test.message('/start', 11));
    fail(new Error('Old welcome failed'));
    await rejected;
    await test.service.handleUpdate(test.message('/start', 11));
    expect(test.bot.sendMessage).toHaveBeenCalledTimes(3);
  });

  it('sends through the separate bot token and keeps provider failures generic', async () => {
    const test = setup();
    const client = new CreatorTelegramClient(test.config as never);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    } as Response);
    try {
      await client.sendMessage(123, 'hello');
      expect(fetchMock.mock.calls[0][0]).toBe(
        'https://api.telegram.org/bot987654321:test-creator-token/sendMessage',
      );
      fetchMock.mockRejectedValueOnce(new Error('unsafe provider error'));
      await expect(client.sendMessage(123, 'hello')).rejects.toThrow(
        'Telegram bot request failed',
      );
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('caches the Creator bot identity and retries a failed lookup', async () => {
    const test = setup();
    const client = new CreatorTelegramClient(test.config as never);
    const identity = {
      id: 987654321,
      is_bot: true,
      username: 'cw_creator_bot',
    };
    const getMe = jest
      .spyOn(client, 'getMe')
      .mockRejectedValueOnce(new Error('Lookup failed'))
      .mockResolvedValue(identity);
    await expect(client.getIdentity()).rejects.toThrow('Lookup failed');
    const [first, second] = await Promise.all([
      client.getIdentity(),
      client.getIdentity(),
    ]);
    expect(first).toEqual(identity);
    expect(second).toEqual(identity);
    expect(getMe).toHaveBeenCalledTimes(2);
  });

  it('sends copyable text verbatim with a preformatted entity and no buttons', async () => {
    const test = setup();
    const client = new CreatorTelegramClient(test.config as never);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 1 } }),
    } as Response);
    try {
      const text = 'សួស្តី 😀 <hello> & `text`\n```';
      await client.sendCopyableMessage(123, text);
      expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
        chat_id: 123,
        text,
        entities: [
          { type: 'pre', offset: 0, length: text.length, language: 'copy' },
        ],
      });
    } finally {
      fetchMock.mockRestore();
    }
  });

  it('treats acknowledgement failures as optional and edits the status if deletion fails', async () => {
    const test = setup();
    const client = new CreatorTelegramClient(test.config as never);
    const send = jest
      .spyOn(client, 'sendMessage')
      .mockRejectedValue(new Error('Telegram unavailable'));
    const remove = jest
      .spyOn(client, 'deleteMessage')
      .mockRejectedValue(new Error('Cannot delete'));
    const edit = jest.spyOn(client, 'editMessage').mockResolvedValue(true);
    await expect(client.sendStatus(123, 'Queued')).resolves.toBeNull();
    await client.clearStatus(123, 55, 'Request finished.');
    expect(edit).toHaveBeenCalledWith(123, 55, 'Request finished.');
    edit.mockRejectedValueOnce(new Error('Message missing'));
    await expect(
      client.clearStatus(123, 55, 'Request finished.'),
    ).resolves.toBeUndefined();
    await client.clearStatus(123, null, 'Request finished.');
    expect(remove).toHaveBeenCalledTimes(2);
    send.mockRestore();
    remove.mockRestore();
    edit.mockRestore();
  });
});
