import { TelegramBotService } from './telegram-bot.service';
import { TelegramBotClient } from './telegram-bot.client';
import {
  buildMemberQrDirectory,
  readMemberQrMention,
} from './telegram-member-qr';

describe('Telegram group member QR commands', () => {
  const chatId = -1001234567890;
  const observedMembers = [
    { telegramUserId: '1', displayName: 'Sovan Krusna', isActive: true },
    { telegramUserId: '2', displayName: 'Kakada Ngen', isActive: true },
    { telegramUserId: '3', displayName: 'Phann Phearun', isActive: true },
    { telegramUserId: '4', displayName: 'Veng E Sorn', isActive: true },
  ];
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
      $queryRaw: jest.fn().mockImplementation(async (sql) => {
        const query = sql.join('');
        if (query.includes('lower(username)')) return [{ telegramUserId: '2' }];
        if (query.includes('FROM telegram_group_members'))
          return observedMembers;
        if (query.includes('FROM member_khqr_images'))
          return [{ version: 'a'.repeat(64) }];
        return [{ updateId: 1n }];
      }),
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
      getChatMember: jest
        .fn()
        .mockResolvedValue({
          status: 'member',
          user: {
            id: 2,
            first_name: 'Kakada',
            last_name: 'Ngen',
            username: 'kakada',
          },
        }),
    };
    const service = new TelegramBotService(
      prisma as never,
      { getOrThrow: () => 'https://example.com' } as never,
      bot as never,
      {} as never,
      {} as never,
    );
    const send = (text: string, type = 'supergroup', groupChatId = chatId) =>
      service.handleUpdate({
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 123, first_name: 'Member' },
          chat: { id: type === 'private' ? 123 : groupChatId, type },
          text,
        },
      });
    const choose = (key: string, type = 'supergroup', groupChatId = chatId) =>
      service.handleUpdate({
        update_id: 2,
        callback_query: {
          id: 'qr-choice',
          from: { id: 123, first_name: 'Member' },
          data: `khqr:member:${key}`,
          message: {
            message_id: 11,
            from: { id: 456, is_bot: true },
            chat: { id: type === 'private' ? 123 : groupChatId, type },
          },
        },
      });
    return { prisma, bot, send, choose, service };
  }

  it.each(['/help', '/help@ChlatWorkBot', ' /HELP '])(
    'lists group commands without requiring an account for %s',
    async (command) => {
      const { bot, send, prisma } = setup();
      await send(command);
      const help = bot.sendMessage.mock.calls[0][1];
      for (const command of [
        '/help',
        '/$',
        '/@username',
        '/joinvote',
        '/split',
        '/dailyvote',
        '/votetime',
        '/voteduration',
        '/stopdailyvote',
      ])
        expect(help).toContain(command);
      expect(help).toContain('group admin required');
      expect(prisma.socialAccount.findUnique).not.toHaveBeenCalled();
      expect(bot.sendPhoto).not.toHaveBeenCalled();
    },
  );

  it('lists private commands for an unlinked user without accessing account data', async () => {
    const { bot, send, prisma } = setup();
    await send('/help', 'private');
    const help = bot.sendMessage.mock.calls[0][1];
    for (const command of [
      '/help',
      '/start',
      '/menu',
      '/today',
      '/recent',
      '/spend',
      '/vote',
      '/alerts',
      '/weekly',
      '/cancel',
    ])
      expect(help).toContain(command);
    expect(help).toContain('Sign in with Telegram');
    expect(prisma.socialAccount.findUnique).not.toHaveBeenCalled();
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it.each(['/@kakada', ' /@KaKaDa ', '/ @kakada', '/$ @kakada'])(
    'sends KHQR for a verified username with %s',
    async (text) => {
      const { bot, send, prisma } = setup();
      await send(text);
      expect(bot.getChatMember).toHaveBeenCalledWith(chatId, 2);
      expect(bot.sendPhoto).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('/api/member-khqr/tg_2?'),
        'Kakada Ngen · KHQR',
      );
      const lookup = prisma.$queryRaw.mock.calls.find(([sql]) =>
        sql.join('').includes('lower(username)'),
      );
      expect(lookup?.slice(1)).toEqual([BigInt(chatId), 'kakada']);
      expect(
        prisma.$executeRaw.mock.calls.some(([sql]) =>
          sql.join('').includes('INSERT INTO telegram_member_qr_messages'),
        ),
      ).toBe(true);
    },
  );

  it('sends a selected text mention by ID without a username', async () => {
    const { bot, service } = setup();
    bot.getChatMember.mockResolvedValueOnce({
      status: 'member',
      user: { id: 2, first_name: 'Kakada' },
    });
    await service.handleUpdate({
      update_id: 5,
      message: {
        message_id: 10,
        from: { id: 123 },
        chat: { id: chatId, type: 'supergroup' },
        text: '/Kakada Ngen',
        entities: [
          { type: 'text_mention', offset: 1, length: 11, user: { id: 2 } },
        ],
      },
    });
    expect(bot.sendPhoto).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('/api/member-khqr/tg_2?'),
      'Kakada · KHQR',
    );
  });

  it.each([
    { matches: [] },
    { matches: [{ telegramUserId: '2' }, { telegramUserId: '999' }] },
  ])(
    'recovers missing or stale cached usernames %# using verified group IDs',
    async ({ matches }) => {
      const { bot, send, prisma } = setup();
      const query = prisma.$queryRaw.getMockImplementation()!;
      prisma.$queryRaw.mockImplementation(async (sql) =>
        sql.join('').includes('lower(username)') ? matches : query(sql),
      );
      await send('/@kakada');
      expect(bot.sendPhoto).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('/api/member-khqr/tg_2?'),
        'Kakada Ngen · KHQR',
      );
      const observation = prisma.$executeRaw.mock.calls.find(
        ([sql, , id]) =>
          sql.join('').includes('INSERT INTO telegram_group_members') &&
          id === '2',
      );
      expect(observation?.[6]).toBe('kakada');
      expect(bot.getChatMember.mock.calls.every(([id]) => id === chatId)).toBe(
        true,
      );
    },
  );

  it.each([
    'missing',
    'unavailable',
    'departed',
    'renamed',
    'wrong identity',
    'bot',
  ])(
    'offers the member picker without sending a QR when username recovery is %s',
    async (reason) => {
      const { bot, send, prisma } = setup();
      const query = prisma.$queryRaw.getMockImplementation()!;
      prisma.$queryRaw.mockImplementation(async (sql) =>
        sql.join('').includes('lower(username)') ? [] : query(sql),
      );
      bot.getChatMember.mockImplementation(async (_chatId, userId) => {
        if (reason === 'unavailable') throw new Error('unavailable');
        return {
          status: reason === 'departed' ? 'left' : 'member',
          user: {
            id: reason === 'wrong identity' ? 999 : userId,
            username: ['missing', 'renamed'].includes(reason)
              ? 'someone_else'
              : 'kakada',
            is_bot: reason === 'bot',
          },
        };
      });
      await send('/@kakada');
      expect(bot.sendPhoto).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(bot.sendMessage).toHaveBeenCalledWith(
        chatId,
        'KHQR · Choose a member',
        expect.objectContaining({ inline_keyboard: expect.any(Array) }),
      );
    },
  );

  it('bounds live username recovery in large groups and retains the picker', async () => {
    const { bot, send, prisma } = setup();
    const members = Array.from({ length: 45 }, (_, index) => ({
      telegramUserId: String(index + 1),
      displayName: `Member ${index + 1}`,
      isActive: true,
    }));
    prisma.$queryRaw.mockImplementation(async (sql) => {
      const query = sql.join('');
      if (query.includes('lower(username)')) return [];
      if (query.includes('FROM telegram_group_members')) return members;
      return [{ updateId: 1n }];
    });
    bot.getChatMember.mockRejectedValue(new Error('unavailable'));
    await send('/@kakada');
    expect(bot.getChatMember).toHaveBeenCalledTimes(20);
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    const names = bot.sendMessage.mock.calls
      .filter(([, text]) => text === 'KHQR · Choose a member')
      .flatMap(([, , keyboard]) => keyboard.inline_keyboard.flat());
    expect(names).toHaveLength(45);
  });

  it.each([
    { status: 'left', user: { id: 2, username: 'kakada' } },
    { status: 'kicked', user: { id: 2, username: 'kakada' } },
    {
      status: 'restricted',
      is_member: false,
      user: { id: 2, username: 'kakada' },
    },
    { status: 'member', user: { id: 2, username: 'new_name' } },
    { status: 'member', user: { id: 999, username: 'kakada' } },
    { status: 'member', user: { id: 2, username: 'kakada', is_bot: true } },
  ])(
    'never sends another identity or inactive member QR: %j',
    async (current) => {
      const { bot, send } = setup();
      bot.getChatMember.mockResolvedValueOnce(current);
      await send('/@kakada');
      expect(bot.sendPhoto).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(bot.sendMessage).toHaveBeenCalledWith(
        chatId,
        expect.stringContaining('no longer matches'),
      );
    },
  );

  it('keeps the QR private when Telegram identity verification fails', async () => {
    const { bot, send } = setup();
    bot.getChatMember.mockRejectedValueOnce(new Error('unavailable'));
    await send('/@kakada');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      expect.stringContaining('Could not verify'),
    );
  });

  it.each([
    { matches: [] },
    { matches: [{ telegramUserId: '2' }, { telegramUserId: '999' }] },
  ])(
    'rejects unknown or ambiguous username matches %#',
    async ({ matches }) => {
      const { bot, send, prisma } = setup();
      prisma.$queryRaw.mockImplementation(async (sql) =>
        sql.join('').includes('lower(username)') ? matches : [{ updateId: 1n }],
      );
      await send('/@kakada');
      expect(bot.getChatMember).not.toHaveBeenCalled();
      expect(bot.sendPhoto).not.toHaveBeenCalled();
    },
  );

  it('does not resolve username matches from another group', async () => {
    const { bot, send, prisma } = setup();
    prisma.$queryRaw.mockImplementation(async (sql, ...values) => {
      const query = sql.join('');
      if (query.includes('lower(username)'))
        return values[0] === BigInt(chatId) ? [{ telegramUserId: '2' }] : [];
      if (query.includes('FROM telegram_group_members'))
        return values[0] === BigInt(chatId) ? observedMembers : [];
      return [{ updateId: 1n }];
    });
    await send('/@kakada', 'supergroup', -100999);
    expect(bot.getChatMember).not.toHaveBeenCalled();
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it('reports no upload for a verified mention', async () => {
    const { bot, send, prisma } = setup();
    prisma.$queryRaw.mockImplementation(async (sql) => {
      const query = sql.join('');
      if (query.includes('lower(username)')) return [{ telegramUserId: '2' }];
      if (query.includes('FROM telegram_group_members')) return observedMembers;
      if (query.includes('FROM member_khqr_images')) return [];
      return [{ updateId: 1n }];
    });
    await send('/@kakada');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Kakada Ngen: No KHQR available yet.',
    );
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it('observes and clears usernames from Telegram updates', async () => {
    const { prisma, service } = setup();
    for (const username of ['KaKaDa', undefined]) {
      await service.handleUpdate({
        update_id: 1,
        message: {
          message_id: 10,
          from: { id: 2, first_name: 'Kakada', username },
          chat: { id: chatId, type: 'supergroup' },
          text: 'hello',
        },
      });
    }
    const observations = prisma.$executeRaw.mock.calls.filter(([sql]) =>
      sql.join('').includes('INSERT INTO telegram_group_members'),
    );
    expect(observations.map((call) => call[6])).toEqual(['kakada', null]);
    expect(observations[0][0].join('')).toContain(
      'username = EXCLUDED.username',
    );
    expect(observations[0][0].join('')).toContain(
      'observed_at <= EXCLUDED.observed_at',
    );
  });

  it.each([
    '@kakada',
    '/@kakada extra',
    '/@kakada @someone',
    '/@../kakada',
    '/@',
    '/kakada',
  ])(
    'does not interpret unrelated or malformed text as a mention request: %s',
    (text) => {
      expect(
        readMemberQrMention({
          message_id: 1,
          chat: { id: chatId, type: 'group' },
          text,
        }),
      ).toBeNull();
    },
  );

  it('reads Telegram UTF-16 text-mention offsets without guessing display names', () => {
    const message = {
      message_id: 1,
      chat: { id: chatId, type: 'group' },
      text: '/$ 😀 Kakada',
      entities: [
        { type: 'text_mention', offset: 3, length: 9, user: { id: 2 } },
      ],
    };
    expect(readMemberQrMention(message)).toEqual({ userId: '2' });
    expect(
      readMemberQrMention({ ...message, text: message.text + ' extra' }),
    ).toBeNull();
    expect(
      readMemberQrMention({
        ...message,
        entities: [{ ...message.entities[0], offset: -1 }],
      }),
    ).toBeNull();
  });

  it('uses the numeric user ID in Telegram member lookup', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ok: true,
          result: { status: 'member', user: { id: 2 } },
        }),
      ),
    );
    const client = new TelegramBotClient({
      getOrThrow: () => 'dummy-token',
    } as never);
    await expect(client.getChatMember(chatId, 2)).resolves.toEqual({
      status: 'member',
      user: { id: 2 },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botdummy-token/getChatMember',
      expect.objectContaining({
        body: JSON.stringify({ chat_id: chatId, user_id: 2 }),
      }),
    );
  });

  it.each([
    ['/tg_2', 'tg_2', 'Kakada Ngen', 'supergroup'],
    ['/tg_1', 'tg_1', 'Sovan Krusna', 'group'],
    ['/TG_2@ExampleBot', 'tg_2', 'Kakada Ngen', 'supergroup'],
  ])(
    'sends %s from the database to the same group',
    async (text, key, name, type) => {
      const { bot, send, prisma } = setup();
      await send(text, type);
      const url = `https://example.com/api/member-khqr/${key}?v=${'a'.repeat(64)}`;
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
    ['/kakada'],
    ['/tg_999'],
    ['/tg_1 extra'],
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
    await send('/tg_2');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Kakada Ngen: No KHQR available yet.',
    );
  });

  it('sends a database JPEG through the group QR flow', async () => {
    const { bot, choose } = setup();
    fetchMock.mockResolvedValue(
      new Response(null, { headers: { 'Content-Type': 'image/jpeg' } }),
    );
    await choose('tg_2');
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
    expect(bot.deleteMessages).toHaveBeenCalledWith(chatId, [11]);
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
      await expect(send('/tg_2')).rejects.toThrow();
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
        'https://example.com/api/member-khqr/tg_2?v=example',
        'kakada · KHQR',
      ),
    ).resolves.toEqual({ message_id: 42 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/botdummy-token/sendPhoto',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          chat_id: chatId,
          photo: 'https://example.com/api/member-khqr/tg_2?v=example',
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
    await expect(send('/tg_2')).rejects.toThrow('database unavailable');
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

  it.each(['KHQR', ' khqr ', '/$'])(
    'shows the supplied names only when observed in this group for %s',
    async (text) => {
      const { bot, send } = setup();
      await send(text);
      const keyboard = bot.sendMessage.mock.calls[0][2].inline_keyboard.flat();
      expect(keyboard.map((button: { text: string }) => button.text)).toEqual(
        observedMembers.map((member) => member.displayName),
      );
      expect(keyboard).toHaveLength(4);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['tg_1', 'Sovan Krusna'],
    ['tg_2', 'Kakada Ngen'],
    ['tg_3', 'Phann Phearun'],
  ])(
    'sends the database QR for %s and keeps its deletion deadline',
    async (key, name) => {
      const { bot, choose, prisma } = setup();
      await choose(key);
      expect(bot.answerCallback).toHaveBeenCalledWith('qr-choice');
      expect(bot.sendPhoto).toHaveBeenCalledWith(
        chatId,
        `https://example.com/api/member-khqr/${key}?v=${'a'.repeat(64)}`,
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
    await choose('tg_3');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Phann Phearun: No KHQR available yet.',
    );
    expect(bot.sendPhoto).not.toHaveBeenCalled();
  });

  it('deletes the selected menu only after the QR is sent and tracked', async () => {
    const { bot, choose, prisma } = setup();
    await choose('tg_1');
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
    await choose('tg_1');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Sovan Krusna: No KHQR available yet.',
    );
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('keeps the menu if photo delivery fails', async () => {
    const { bot, choose } = setup();
    bot.sendPhoto.mockRejectedValue(new Error('delivery failed'));
    await expect(choose('tg_1')).rejects.toThrow('delivery failed');
    expect(bot.deleteMessages).not.toHaveBeenCalled();
  });

  it('does not retry a delivered QR when menu deletion fails', async () => {
    const { bot, choose, prisma } = setup();
    bot.deleteMessages.mockRejectedValue(new Error('menu deletion failed'));
    await expect(choose('tg_1')).resolves.toBeUndefined();
    expect(bot.sendPhoto).toHaveBeenCalledTimes(1);
    expect(prisma.telegramBotUpdate.update).toHaveBeenCalled();
    expect(prisma.telegramBotUpdate.deleteMany).not.toHaveBeenCalled();
  });

  it('reports a missing database upload without falling back to filenames', async () => {
    const { bot, choose, prisma } = setup();
    prisma.$queryRaw.mockImplementation(async (sql) => {
      const query = sql.join('');
      if (query.includes('FROM telegram_group_members')) return observedMembers;
      if (query.includes('FROM member_khqr_images')) return [];
      return [{ updateId: 2n }];
    });
    await choose('tg_2');
    expect(bot.sendMessage).toHaveBeenCalledWith(
      chatId,
      'Kakada Ngen: No KHQR available yet.',
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
    await choose('tg_1', 'private');
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps identical names as separate identities and excludes departed members', () => {
    expect(
      buildMemberQrDirectory([
        { telegramUserId: '1', displayName: 'Kakada Ngen', isActive: true },
        { telegramUserId: '2', displayName: 'Kakada Ngen', isActive: true },
        { telegramUserId: '3', displayName: 'Former Member', isActive: false },
      ]),
    ).toEqual([
      { key: 'tg_1', displayName: 'Kakada Ngen' },
      { key: 'tg_2', displayName: 'Kakada Ngen' },
    ]);
  });

  it('keeps the same image key after a display name changes', () => {
    const renamed = buildMemberQrDirectory([
      { ...observedMembers[0], displayName: 'New name' },
    ]);
    expect(renamed).toEqual([{ key: 'tg_1', displayName: 'New name' }]);
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

  it.each(['tg_4', 'tg_2'])(
    'uses the admin-uploaded image for %s',
    async (key) => {
      const { bot, choose, prisma } = setup();
      prisma.$queryRaw.mockImplementation(async (sql) => {
        const query = sql.join('');
        if (query.includes('FROM telegram_group_members'))
          return observedMembers;
        if (query.includes('FROM member_khqr_images'))
          return [{ version: 'a'.repeat(64) }];
        return [{ updateId: 2n }];
      });
      await choose(key);
      expect(bot.sendPhoto).toHaveBeenCalledWith(
        chatId,
        `https://example.com/api/member-khqr/${key}?v=${'a'.repeat(64)}`,
        expect.stringContaining('KHQR'),
      );
      expect(bot.deleteMessages).toHaveBeenCalledWith(chatId, [11]);
      const lookup = prisma.$queryRaw.mock.calls.find(([sql]) =>
        sql.join('').includes('FROM member_khqr_images'),
      );
      expect(lookup?.slice(1)).toEqual([key]);
    },
  );

  it('leaves an empty group directory empty', () => {
    expect(buildMemberQrDirectory([])).toEqual([]);
  });

  it('keeps KHQR menus and stale button selections inside their own group', async () => {
    const otherGroup = -1009876543210;
    const { bot, send, choose, prisma } = setup();
    prisma.$queryRaw.mockImplementation(async (sql, ...values) => {
      if (sql.join('').includes('FROM telegram_group_members')) {
        return values[0] === BigInt(chatId)
          ? [
              observedMembers.find(
                (member) => member.displayName === 'Sovan Krusna',
              ),
            ]
          : [
              observedMembers.find(
                (member) => member.displayName === 'Kakada Ngen',
              ),
            ];
      }
      return [{ updateId: 1n }];
    });
    await send('/$');
    await send('/$', 'supergroup', otherGroup);
    expect(
      bot.sendMessage.mock.calls.map(([id, , keyboard]) => ({
        id,
        names: keyboard.inline_keyboard
          .flat()
          .map((button: { text: string }) => button.text),
      })),
    ).toEqual([
      { id: chatId, names: ['Sovan Krusna'] },
      { id: otherGroup, names: ['Kakada Ngen'] },
    ]);
    await send('/tg_1', 'supergroup', otherGroup);
    await choose('tg_1', 'supergroup', otherGroup);
    expect(bot.sendPhoto).not.toHaveBeenCalled();
    expect(bot.answerCallback).toHaveBeenCalledWith(
      'qr-choice',
      expect.stringContaining('Member unavailable'),
    );
  });
});
