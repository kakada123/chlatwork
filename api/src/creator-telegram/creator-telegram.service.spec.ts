import { AiFeature } from '@prisma/client';
import { CreatorTelegramService } from './creator-telegram.service';
import { CreatorTelegramController } from './creator-telegram.controller';
import { CreatorTelegramClient } from './creator-telegram.client';

function setup() {
  const requests: any[] = [];
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
      createMany: jest.fn(),
      updateMany: jest.fn(),
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
  });

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

  it('ignores groups, bot senders, and mismatched private-chat owners', async () => {
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
        if (preference[cursor] < where[cursor].lt)
          Object.assign(preference, data);
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
    ).toHaveLength(4);
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
