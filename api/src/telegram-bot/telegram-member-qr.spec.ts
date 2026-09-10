import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotClient } from './telegram-bot.client';
import {
  buildMemberQrDirectory,
  MEMBER_QR_DIRECTORY,
} from './telegram-member-qr';

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
      $queryRaw: jest
        .fn()
        .mockImplementation(async (sql) =>
          sql.join('').includes('FROM telegram_group_members')
            ? []
            : [{ updateId: 1n }],
        ),
      telegramBotUpdate: { update: jest.fn(), deleteMany: jest.fn() },
      socialAccount: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const bot = {
      sendPhoto: jest.fn().mockResolvedValue({
        message_id: 42,
        date: Date.parse('2026-09-10T06:00:00Z') / 1_000,
      }),
      sendMessage: jest.fn(),
      deleteMessages: jest.fn().mockResolvedValue(true),
      answerCallback: jest.fn(),
    };
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
    const choose = (key: string, type = 'supergroup') =>
      service.handleUpdate({
        update_id: 2,
        callback_query: {
          id: 'qr-choice',
          from: { id: 123, first_name: 'Member' },
          data: `khqr:member:${key}`,
          message: {
            message_id: 11,
            from: { id: 456, is_bot: true },
            chat: { id: type === 'private' ? 123 : chatId, type },
          },
        },
      });
    return { prisma, bot, send, choose };
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
      const registration = prisma.$executeRaw.mock.calls.find(([sql]) =>
        sql.join('').includes('INSERT INTO telegram_member_qr_messages'),
      );
      expect(registration?.slice(1)).toEqual([
        BigInt(chatId),
        42,
        new Date('2026-09-10T06:00:00Z'),
        new Date('2026-09-11T06:00:00Z'),
        new Date('2026-09-11T06:00:00Z'),
      ]);
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

  it('removes the sent QR if its deletion deadline cannot be stored', async () => {
    const { bot, send, prisma } = setup();
    prisma.$executeRaw.mockImplementation(async (sql) => {
      if (sql.join('').includes('INSERT INTO telegram_member_qr_messages')) {
        throw new Error('database unavailable');
      }
      return 1;
    });
    await expect(send('/kakada')).rejects.toThrow('database unavailable');
    expect(bot.deleteMessages).toHaveBeenCalledWith(chatId, [42]);
    expect(prisma.telegramBotUpdate.update).not.toHaveBeenCalled();
    expect(prisma.telegramBotUpdate.deleteMany).toHaveBeenCalled();
  });

  it('uses retry-safe bulk deletion for a single QR message', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: true })),
    );
    const client = new TelegramBotClient({
      getOrThrow: () => 'dummy-token',
    } as never);
    await expect(client.deleteMessages(chatId, [42])).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botdummy-token/deleteMessages',
      expect.objectContaining({
        body: JSON.stringify({ chat_id: chatId, message_ids: [42] }),
      }),
    );
  });

  it.each(['KHQR', ' khqr ', '/khqr'])(
    'shows every supplied name for %s',
    async (text) => {
      const { bot, send } = setup();
      await send(text);
      const keyboard = bot.sendMessage.mock.calls[0][2].inline_keyboard.flat();
      expect(keyboard.map((button: { text: string }) => button.text)).toEqual(
        MEMBER_QR_DIRECTORY.map((member) => member.displayName),
      );
      expect(keyboard).toHaveLength(10);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['sna', 'Sovan Krusna', 'sna'],
    ['daro', 'Mrr. ដារ៉ូ', 'daro'],
    ['phearun', 'Phann Phearun', 'phearun'],
    ['sikeat', '𝙎𝙞𝙠𝙚𝙖𝙩', 'sikeat'],
    ['vexal', 'vexal.s', 'vexal'],
    ['visal', 'MOEUNG VISAL', 'visal'],
    ['kakada', 'Kakada Ngen', 'sna'],
  ])(
    'sends the mapped QR for %s and keeps its deletion deadline',
    async (key, name, imageName) => {
      const { bot, choose, prisma } = setup();
      await choose(key);
      expect(bot.answerCallback).toHaveBeenCalledWith('qr-choice');
      expect(bot.sendPhoto).toHaveBeenCalledWith(
        chatId,
        `https://example.com/images/khqr/${imageName}.png`,
        `${name} · KHQR`,
      );
      expect(
        prisma.$executeRaw.mock.calls.some(([sql]) =>
          sql.join('').includes('INSERT INTO telegram_member_qr_messages'),
        ),
      ).toBe(true);
    },
  );

  it.each([
    [404, 'image/png'],
    [200, 'text/html'],
  ])('reports a missing QR (%s, %s)', async (status, contentType) => {
    const { bot, choose } = setup();
    fetchMock.mockResolvedValue(
      new Response(null, { status, headers: { 'Content-Type': contentType } }),
    );
    await choose('phearun');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Phann Phearun: No KHQR available yet.',
    );
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it('deletes the selected menu only after the QR is sent and tracked', async () => {
    const { bot, choose, prisma } = setup();
    await choose('sna');
    expect(bot.deleteMessages).toHaveBeenCalledWith(chatId, [11]);
    const trackingIndex = prisma.$executeRaw.mock.calls.findIndex(([sql]) =>
      sql.join('').includes('INSERT INTO telegram_member_qr_messages'),
    );
    expect(bot.sendPhoto.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.$executeRaw.mock.invocationCallOrder[trackingIndex],
    );
    expect(
      prisma.$executeRaw.mock.invocationCallOrder[trackingIndex],
    ).toBeLessThan(bot.deleteMessages.mock.invocationCallOrder[0]);
  });

  it('keeps the menu when no KHQR is available', async () => {
    const { bot, choose } = setup();
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    await choose('sna');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Sovan Krusna: No KHQR available yet.',
    );
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('keeps the menu if photo delivery fails', async () => {
    const { bot, choose } = setup();
    bot.sendPhoto.mockRejectedValue(new Error('delivery failed'));
    await expect(choose('sna')).rejects.toThrow('delivery failed');
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('does not retry a delivered QR when menu deletion fails', async () => {
    const { bot, choose, prisma } = setup();
    bot.deleteMessages.mockRejectedValue(new Error('menu deletion failed'));
    await expect(choose('sna')).resolves.toBeUndefined();
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalled();
    expect(prisma.telegramBotUpdate.deleteMany).not.toHaveBeenCalled();
  });

  it('reports an unmapped member without guessing an image', async () => {
    const { bot, choose } = setup();
    await choose('sorn');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Veng E Sorn: No KHQR available yet.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects selections outside this group roster', async () => {
    const { bot, choose } = setup();
    await choose('tg_999');
    expect(bot.answerCallback).toHaveBeenCalledWith(
      'qr-choice',
      expect.stringContaining('Member unavailable'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it.each(['../kakada', 'sna.png'])(
    'rejects forged selection %s',
    async (key) => {
      const { bot, choose } = setup();
      await choose(key);
      expect(bot.sendPhoto).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('does not handle a group QR button in a private chat', async () => {
    const { bot, choose } = setup();
    await choose('sna', 'private');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('adds group-observed members with no guessed payment mapping and removes departures', () => {
    const members = buildMemberQrDirectory([
      { telegramUserId: '1', displayName: 'Sikeat', isActive: true },
      { telegramUserId: '2', displayName: 'Sovan Krusna', isActive: false },
      { telegramUserId: '3', displayName: 'New Member', isActive: true },
      { telegramUserId: '4', displayName: 'Former Member', isActive: false },
    ]);
    expect(members.filter((member) => member.key === 'sikeat')).toHaveLength(1);
    expect(members.some((member) => member.key === 'sna')).toBe(false);
    expect(members).toContainEqual({
      key: 'tg_3',
      displayName: 'New Member',
      imageName: null,
    });
    expect(members.some((member) => member.key === 'tg_4')).toBe(false);
  });

  it('queries the current group and allows an observed member without an image', async () => {
    const { bot, choose, prisma } = setup();
    prisma.$queryRaw.mockImplementation(async (sql) =>
      sql.join('').includes('FROM telegram_group_members')
        ? [{ telegramUserId: '999', displayName: 'New Member', isActive: true }]
        : [{ updateId: 2n }],
    );
    await choose('tg_999');
    const query = prisma.$queryRaw.mock.calls.find(([sql]) =>
      sql.join('').includes('FROM telegram_group_members'),
    );
    expect(query?.slice(1)).toEqual([BigInt(chatId)]);
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'New Member: No KHQR available yet.',
    );
  });
});
