import type { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TelegramBotClient } from './telegram-bot.client';

describe('Telegram animation delivery', () => {
  afterEach(() => jest.restoreAllMocks());

  function client() {
    return new TelegramBotClient({
      getOrThrow: () => 'dummy-test-token',
    } as unknown as ConfigService);
  }

  it('sends the bundled animation as a reply to the final results', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: { message_id: 99 } })),
      );
    await expect(
      client().sendAnimation(
        -100,
        'https://example.com/images/telegram/vote-celebration.gif',
        88,
      ),
    ).resolves.toEqual({ message_id: 99 });
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.telegram.org/botdummy-test-token/sendAnimation',
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      chat_id: -100,
      animation: 'https://example.com/images/telegram/vote-celebration.gif',
      reply_parameters: { message_id: 88, allow_sending_without_reply: true },
    });
  });

  it('keeps provider failures generic', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Provider URL'));
    await expect(
      client().sendAnimation(-100, 'https://example.com/a.gif', 88),
    ).rejects.toThrow(
      new ServiceUnavailableException('Telegram bot request failed'),
    );
  });
});

describe('Telegram Business API', () => {
  afterEach(() => jest.restoreAllMocks());
  function client() {
    return new TelegramBotClient({
      getOrThrow: () => 'dummy-test-token',
    } as unknown as ConfigService);
  }

  it('disables URL previews only when explicitly requested for private security reports', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ ok: true, result: { message_id: 99 } }),
          ),
      );
    await client().sendMessage(
      999,
      'Private security report',
      undefined,
      undefined,
      undefined,
      { disableLinkPreview: true },
    );
    await client().editMessage(999, 99, 'Updated private report', undefined, {
      disableLinkPreview: true,
    });
    await client().sendMessage(999, 'Ordinary message');
    for (const index of [0, 1]) {
      const payload = JSON.parse(
        fetchMock.mock.calls[index]![1]!.body as string,
      );
      expect(payload.link_preview_options).toEqual({ is_disabled: true });
      expect(payload.parse_mode).toBeUndefined();
    }
    expect(
      JSON.parse(fetchMock.mock.calls[2]![1]!.body as string)
        .link_preview_options,
    ).toBeUndefined();
  });

  it('sends and edits security warnings through the Business connection', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ ok: true, result: { message_id: 99 } }),
          ),
      );
    await client().sendBusinessMessage(
      'test-connection',
      222,
      'Infected file detected',
    );
    await client().editBusinessMessage(
      'test-connection',
      222,
      99,
      'File message deleted',
    );
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      business_connection_id: 'test-connection',
      chat_id: 222,
      text: 'Infected file detected',
    });
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({
      business_connection_id: 'test-connection',
      chat_id: 222,
      message_id: 99,
      text: 'File message deleted',
    });
    expect(fetchMock.mock.calls[0]![0]).toMatch(/\/sendMessage$/);
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/editMessageText$/);
  });

  it('rejects invalid Business warning recipients and contents before fetching', () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    for (const chatId of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() =>
        client().sendBusinessMessage('test-connection', chatId, 'Warning'),
      ).toThrow(BadRequestException);
    }
    expect(() => client().sendBusinessMessage('', 222, 'Warning')).toThrow(
      BadRequestException,
    );
    expect(() =>
      client().sendBusinessMessage('test-connection', 222, ' '),
    ).toThrow(BadRequestException);
    expect(() =>
      client().sendBusinessMessage('test-connection', 222, 'x'.repeat(4097)),
    ).toThrow(BadRequestException);
    expect(() =>
      client().editBusinessMessage('test-connection', 222, 0, 'Warning'),
    ).toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('looks up current connection permissions and deletes using the connection ID', async () => {
    const connection = {
      id: 'test-connection',
      is_enabled: true,
      user: { id: 111 },
      rights: { can_delete_all_messages: true },
    };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: connection })),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: true })),
      );
    await expect(
      client().getBusinessConnection('test-connection'),
    ).resolves.toEqual(connection);
    await expect(
      client().deleteBusinessMessages('test-connection', [10]),
    ).resolves.toBe(true);
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://api.telegram.org/botdummy-test-token/getBusinessConnection',
    );
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toEqual({
      business_connection_id: 'test-connection',
      message_ids: [10],
    });
    expect(fetchMock.mock.calls[1]![0]).toBe(
      'https://api.telegram.org/botdummy-test-token/deleteBusinessMessages',
    );
  });

  it.each(
    [
      [],
      [0],
      [1.5],
      [1, 1],
      Array.from({ length: 101 }, (_, index) => index + 1),
    ].map((ids) => ({ ids })),
  )('rejects invalid deletion batches %j', async ({ ids }) => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(
      client().deleteBusinessMessages('test-connection', ids),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an explicit successful deletion response', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, result: false })),
      );
    await expect(
      client().deleteBusinessMessages('test-connection', [10]),
    ).rejects.toThrow('Telegram business deletion failed');
  });

  it('does not expose Telegram errors or connection IDs to callers', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, description: 'private connection' }),
          { status: 403 },
        ),
      );
    await expect(
      client().deleteBusinessMessages('test-connection', [10]),
    ).rejects.toThrow('Telegram bot request failed');
  });
});

describe('Bounded Telegram file downloads', () => {
  afterEach(() => jest.restoreAllMocks());
  const client = () =>
    new TelegramBotClient({
      getOrThrow: () => 'dummy-test-token',
    } as unknown as ConfigService);
  const fileResponse = (
    file: Record<string, unknown> = { file_path: 'documents/file.pdf' },
  ) => new Response(JSON.stringify({ ok: true, result: file }));

  it('downloads bytes without allowing redirects from the token-bearing URL', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(fileResponse())
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])));
    await expect(client().downloadFile('dummy-id', 10)).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(fetchMock.mock.calls[1]![1]).toMatchObject({
      redirect: 'error',
      signal: expect.any(AbortSignal),
    });
  });

  it('cancels when streamed bytes exceed the limit even without Content-Length', async () => {
    const cancel = jest.fn();
    let reads = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        reads++;
        controller.enqueue(new Uint8Array(8));
      },
      cancel,
    });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(fileResponse())
      .mockResolvedValueOnce(new Response(body));
    await expect(client().downloadFile('dummy-id', 10)).rejects.toThrow(
      'too large',
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(reads).toBeLessThanOrEqual(4);
  });

  it('rejects a declared oversized file before opening its download URL', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        fileResponse({ file_path: 'documents/file.pdf', file_size: 11 }),
      );
    await expect(client().downloadFile('dummy-id', 10)).rejects.toThrow(
      'too large',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['11', 'invalid'])(
    'cancels oversized/invalid Content-Length %s',
    async (length) => {
      const cancel = jest.fn();
      const body = new ReadableStream({ cancel });
      jest
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(fileResponse())
        .mockResolvedValueOnce(
          new Response(body, { headers: { 'Content-Length': length } }),
        );
      await expect(client().downloadFile('dummy-id', 10)).rejects.toThrow(
        'too large',
      );
      expect(cancel).toHaveBeenCalled();
    },
  );

  it('keeps read failures generic rather than exposing the token-bearing URL', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.error(new Error('private token URL'));
      },
    });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(fileResponse())
      .mockResolvedValueOnce(new Response(body));
    await expect(client().downloadFile('dummy-id', 10)).rejects.toThrow(
      'Telegram file download failed',
    );
  });

  it.each([0, -1, NaN, Infinity, 1.5])(
    'rejects invalid byte limits %s before any network request',
    async (maxBytes) => {
      const fetchMock = jest
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('No test network requests'));
      await expect(client().downloadFile('dummy-id', maxBytes)).rejects.toThrow(
        'invalid',
      );
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});
