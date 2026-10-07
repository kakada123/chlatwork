import type { ConfigService } from '@nestjs/config';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
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
