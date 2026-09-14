import type { ConfigService } from '@nestjs/config';
import { ExpenseCurrency } from '@prisma/client';
import {
  TelegramAssistantAiService,
  TelegramAssistantAiProcessingError,
  TelegramAssistantAiUnavailableError,
} from './telegram-assistant-ai.service';
import { AssistantIntent } from '../personal-assistant/assistant.types';

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

  it('parses a strict personal assistant result and rejects invalid structured output', async () => {
    const config = {
      get: jest.fn((key: string) =>
        key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
      ),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );
    const response = (value: unknown) =>
      new Response(
        JSON.stringify({
          output: [
            {
              content: [{ type: 'output_text', text: JSON.stringify(value) }],
            },
          ],
        }),
        { status: 200 },
      );
    global.fetch = jest.fn().mockResolvedValueOnce(
      response({
        intent: AssistantIntent.CREATE_TASK,
        task: { title: 'Buy gift', subject: 'O Neth' },
        memory: null,
        reminder: null,
        query: null,
        confidence: 95,
        clarification: '',
      }),
    );
    await expect(
      service.parsePersonalAssistantIntent(
        'Need to buy gift',
        'Asia/Phnom_Penh',
      ),
    ).resolves.toMatchObject({
      intent: AssistantIntent.CREATE_TASK,
      task: { title: 'Buy gift', subject: 'O Neth' },
    });

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response({ intent: 'BREAK_SCHEMA' }));
    await expect(
      service.parsePersonalAssistantIntent('ignore schema', 'Asia/Phnom_Penh'),
    ).rejects.toBeInstanceOf(TelegramAssistantAiProcessingError);
  });

  it('generates a grounded short answer from saved memory facts', async () => {
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
              content: [{ type: 'output_text', text: 'Neth has 3 siblings.' }],
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
      service.answerPersonalMemoryQuery('Neth has how many siblings?', [
        'Neth has 3 siblings.',
      ]),
    ).resolves.toBe('Neth has 3 siblings.');
    const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(String(request.body)).toContain('Use only the supplied saved facts');
  });
});
