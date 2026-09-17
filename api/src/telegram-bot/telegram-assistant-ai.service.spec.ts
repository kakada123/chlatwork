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

  it('routes personal assistant intent and memory answers to Gemini', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            AI_USE_GEMINI: 'true',
            GEMINI_API_KEY: 'test-gemini-key',
          })[key],
      ),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );
    const generateContent = jest
      .fn()
      .mockResolvedValueOnce({
        candidates: [{ finishReason: 'STOP' }],
        text: JSON.stringify({
          intent: AssistantIntent.CREATE_TASK,
          task: { title: 'Buy gift', subject: 'O Neth' },
          memory: null,
          reminder: null,
          query: null,
          confidence: 95,
          clarification: '',
        }),
      })
      .mockResolvedValueOnce({
        candidates: [{ finishReason: 'STOP' }],
        text: 'Neth has 3 siblings.',
      });
    Object.assign(service, { geminiClient: { models: { generateContent } } });
    global.fetch = jest.fn();

    expect(service.isConfigured()).toBe(true);
    await expect(
      service.parsePersonalAssistantIntent('Buy a gift', 'Asia/Phnom_Penh'),
    ).resolves.toMatchObject({ intent: AssistantIntent.CREATE_TASK });
    await expect(
      service.answerPersonalMemoryQuery('How many siblings?', [
        'Neth has 3 siblings.',
      ]),
    ).resolves.toBe('Neth has 3 siblings.');
    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(
      generateContent.mock.calls[0][0].config.responseJsonSchema,
    ).toMatchObject({
      type: 'object',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses Gemini for Telegram receipts while preserving currency validation', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            AI_USE_GEMINI: 'true',
            GEMINI_API_KEY: 'test-gemini-key',
          })[key],
      ),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );
    const generateContent = jest.fn().mockResolvedValue({
      candidates: [{ finishReason: 'STOP' }],
      text: JSON.stringify({
        merchant: 'Lunch Shop',
        amount: '4.50',
        currency: 'USD',
        category: 'Food',
        date: '2026-09-04',
        confidence: 92,
      }),
    });
    Object.assign(service, { geminiClient: { models: { generateContent } } });
    global.fetch = jest.fn();

    await expect(
      service.extractReceipt(
        new Uint8Array([1, 2, 3]),
        'image/png',
        ExpenseCurrency.USD,
      ),
    ).resolves.toMatchObject({ expense: { amount: '4.50', category: 'Food' } });
    expect(generateContent.mock.calls[0][0].contents[0].parts[1]).toEqual({
      inlineData: { mimeType: 'image/png', data: 'AQID' },
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('transcribes Telegram voice with Gemini and deletes the uploaded file', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            AI_USE_GEMINI: 'true',
            GEMINI_API_KEY: 'test-gemini-key',
          })[key],
      ),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );
    const upload = jest.fn().mockResolvedValue({
      name: 'files/voice',
      uri: 'https://files.example/voice',
    });
    const create = jest.fn().mockResolvedValue({ output_text: 'Lunch 4.50' });
    const deleteFile = jest.fn().mockResolvedValue({});
    Object.assign(service, {
      geminiClient: {
        files: { upload, delete: deleteFile },
        interactions: { create },
      },
    });
    global.fetch = jest.fn();

    await expect(
      service.transcribeVoice(new Uint8Array([1, 2]), 'audio/ogg'),
    ).resolves.toBe('Lunch 4.50');
    expect(create.mock.calls[0][0]).toMatchObject({
      model: 'gemini-3.5-transcribe',
      input: [{ type: 'audio', mime_type: 'audio/ogg' }],
    });
    expect(deleteFile).toHaveBeenCalledWith({ name: 'files/voice' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fall back to OpenAI when Gemini is selected without a key', async () => {
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            AI_USE_GEMINI: 'true',
            GEMINI_API_KEY: 'dummy_gemini_api_key',
            OPENAI_API_KEY: 'test-openai-key',
          })[key],
      ),
    };
    const service = new TelegramAssistantAiService(
      config as unknown as ConfigService,
    );
    global.fetch = jest.fn();
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.transcribeVoice(new Uint8Array([1])),
    ).rejects.toBeInstanceOf(TelegramAssistantAiUnavailableError);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
