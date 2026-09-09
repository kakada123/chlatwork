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
      },
    ]);
    expect(test.bot.sendChatAction).toHaveBeenCalledTimes(1);
    expect(test.credits.getBalance).not.toHaveBeenCalled();
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

  it('provides only Khmer AI modes and Creator links', async () => {
    const test = setup();
    await test.service.handleUpdate(test.message('/start'));
    expect(test.bot.setChatMenuButton).toHaveBeenCalledWith(
      123,
      'Open Creator',
      'https://creator.example.com/creator',
    );
    const buttons = test.service.keyboard().inline_keyboard.flat();
    expect(buttons.filter((button) => button.callback_data)).toHaveLength(4);
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
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
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
});
