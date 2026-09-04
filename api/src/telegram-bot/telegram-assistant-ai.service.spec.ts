import type { ConfigService } from '@nestjs/config';
import { ExpenseCurrency } from '@prisma/client';
import {
  TelegramAssistantAiService,
  TelegramAssistantAiUnavailableError,
} from './telegram-assistant-ai.service';

describe('TelegramAssistantAiService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('keeps AI capture disabled for placeholder keys', async () => {
    const config = {
      get: jest.fn().mockReturnValue('dummy_openai_api_key'),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );

    expect(service.isConfigured()).toBe(false);
    await expect(
      service.transcribeVoice(new Uint8Array([1])),
    ).rejects.toBeInstanceOf(TelegramAssistantAiUnavailableError);
  });

  it('transcribes a bounded voice file with the configured model', async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
      ),
    };
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ text: 'Lunch 4.50' }), { status: 200 }),
      );
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );

    await expect(
      service.transcribeVoice(new Uint8Array([1, 2]), 'audio/ogg'),
    ).resolves.toBe('Lunch 4.50');
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/audio/transcriptions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('extracts a same-currency receipt without storing the provider response', async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
      ),
    };
    global.fetch = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    merchant: 'Lunch Shop',
                    amount: '4.50',
                    currency: 'USD',
                    category: 'Food',
                    date: '2026-09-04',
                    confidence: 92,
                  }),
                },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );

    await expect(
      service.extractReceipt(
        new Uint8Array([1, 2, 3]),
        'image/jpeg',
        ExpenseCurrency.USD,
      ),
    ).resolves.toEqual({
      expense: {
        amount: '4.50',
        currency: ExpenseCurrency.USD,
        category: 'Food',
        note: 'Lunch Shop',
      },
      entryDate: '2026-09-04',
      confidence: 92,
    });

    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({ store: false });
  });
});
