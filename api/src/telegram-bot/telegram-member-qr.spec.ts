import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotClient } from './telegram-bot.client';

describe('Telegram group member QR commands', () => {
  const chatId = -1001234567890;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(null, { headers: { 'Content-Type': 'image/png' } }),
      );
  });

  afterEach(() => jest.restoreAllMocks());

  function setup() {
    const prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $queryRaw: jest.fn().mockResolvedValue([{ updateId: 1n }]),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const bot = { sendPhoto: jest.fn(), sendMessage: jest.fn() };
    const service = new TelegramBotService(
      prisma as never,
      { getOrThrow: () => 'https://example.com' } as never,
      bot as never,
      {} as never,
      {} as never,
    );
    const send = (text: string, type = 'supergroup') =>
      service.handleUpdate({
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 123, first_name: 'Member' },
          chat: { id: type === 'private' ? 123 : chatId, type },
          text,
        },
      });
    return { prisma, bot, send };
  }

  it.each([
    ['/kakada', 'kakada', 'supergroup'],
    ['/visal', 'visal', 'group'],
    ['/sikeat', 'sikeat', 'supergroup'],
    ['/Kakada@ExampleBot', 'kakada', 'supergroup'],
    ['/member_2', 'member_2', 'group'],
  ])(
    'sends %s from the frontend to the same group',
    async (text, name, type) => {
      const { bot, send, prisma } = setup();
      await send(text, type);
      const url = `https://example.com/images/khqr/${name}.png`;
      expect(fetchMock).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method: 'HEAD',
          redirect: 'manual',
          signal: expect.any(AbortSignal),
        }),
      );
      expect(bot.sendPhoto).toHaveBeenCalledWith(chatId, url, `${name} · KHQR`);
      expect(prisma.socialAccount.findUnique).not.toHaveBeenCalled();
      expect(prisma.telegramBotUpdate.update).toHaveBeenCalled();
    },
  );

  it.each([
    ['/../kakada'],
    ['/kakada.png'],
    ['/kakada/other'],
    ['/kakada?x=1'],
    ['/kakada extra'],
    ['hello'],
    [`/${'a'.repeat(33)}`],
  ])('ignores invalid QR command %s without a request', async (text) => {
    const { bot, send } = setup();
    await send(text);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it.each([
    [404, 'image/png'],
    [200, 'text/html'],
    [200, 'application/octet-stream'],
  ])('ignores unavailable PNGs (%s, %s)', async (status, contentType) => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status,
        headers: { 'Content-Type': contentType },
      }),
    );
    const { bot, send } = setup();
    await send('/unknown');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(bot.sendMessage).not.toHaveBeenCalled();
  });

  it('preserves built-in group commands', async () => {
    const { bot, send } = setup();
    await send('/joinvote');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('registered'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves private-chat account handling', async () => {
    const { bot, send } = setup();
    await send('/kakada', 'private');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      123,
      expect.stringContaining('sign in'),
      expect.any(Object),
    );
  });

  it.each(['network', 'server', 'telegram'])(
    'allows retry after a %s failure',
    async (failure) => {
      const { bot, send, prisma } = setup();
      if (failure === 'network')
        fetchMock.mockRejectedValue(new Error('unavailable'));
      if (failure === 'server')
        fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
      if (failure === 'telegram')
        bot.sendPhoto.mockRejectedValue(new Error('delivery failed') as never);
      await expect(send('/kakada')).rejects.toThrow();
      expect(prisma.telegramBotUpdate.update).not.toHaveBeenCalled();
      expect(prisma.telegramBotUpdate.deleteMany).toHaveBeenCalled();
    },
  );

  it('sends a photo through the Telegram client', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 } })),
    );
    const client = new TelegramBotClient({
      getOrThrow: () => 'dummy-token',
    } as never);
    await expect(
      client.sendPhoto(
        chatId,
        'https://example.com/images/khqr/kakada.png',
        'kakada · KHQR',
      ),
    ).resolves.toEqual({ message_id: 42 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botdummy-token/sendPhoto',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chat_id: chatId,
          photo: 'https://example.com/images/khqr/kakada.png',
          caption: 'kakada · KHQR',
        }),
      }),
    );
  });
});
