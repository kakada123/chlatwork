import type { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
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
