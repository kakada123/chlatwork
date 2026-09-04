import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExpenseCurrency } from '@prisma/client';
import type { ParsedTelegramExpense } from './telegram-expense-parser';

const OPENAI_API_URL = 'https://api.openai.com/v1';
const OPENAI_TELEGRAM_TRANSCRIPTION_MODEL = 'gpt-transcribe';
const OPENAI_TELEGRAM_VISION_MODEL = 'gpt-5-mini';
const AI_TIMEOUT_MS = 30_000;
const MAX_TRANSCRIPT_LENGTH = 500;
const RECEIPT_CATEGORIES = [
  'Coffee',
  'Food',
  'Transport',
  'Rent',
  'Bills',
  'Internet',
  'Shopping',
  'Health',
  'Entertainment',
  'Loan',
  'Braces',
  'Other',
] as const;

interface ReceiptExtraction {
  merchant: string;
  amount: string;
  currency: 'USD' | 'KHR' | 'UNKNOWN';
  category: (typeof RECEIPT_CATEGORIES)[number];
  date: string;
  confidence: number;
}

interface OpenAiResponse {
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export interface ExtractedReceiptExpense {
  expense: ParsedTelegramExpense;
  entryDate?: string;
  confidence: number;
}

export class TelegramAssistantAiUnavailableError extends Error {}
export class TelegramAssistantAiProcessingError extends Error {}

@Injectable()
export class TelegramAssistantAiService {
  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    const key = this.config.get<string>('OPENAI_API_KEY')?.trim();
    return Boolean(key && !/^(dummy_|replace_)/i.test(key));
  }

  async transcribeVoice(
    bytes: Uint8Array,
    mimeType = 'audio/ogg',
  ): Promise<string> {
    const key = this.apiKey();
    const form = new FormData();
    form.append(
      'file',
      new Blob([this.toArrayBuffer(bytes)], { type: mimeType }),
      this.audioFilename(mimeType),
    );
    form.append(
      'model',
      this.config.get<string>('OPENAI_TELEGRAM_TRANSCRIPTION_MODEL')?.trim() ||
        OPENAI_TELEGRAM_TRANSCRIPTION_MODEL,
    );
    form.append(
      'prompt',
      'A short personal expense in English or Khmer. Preserve the merchant, amount, currency, and Khmer text.',
    );

    const result = await this.requestJson<{ text?: unknown }>(
      `${OPENAI_API_URL}/audio/transcriptions`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      },
    );
    const text = typeof result.text === 'string' ? result.text.trim() : '';
    if (!text || text.length > MAX_TRANSCRIPT_LENGTH) {
      throw new TelegramAssistantAiProcessingError(
        'The voice message did not contain a short expense.',
      );
    }
    return text;
  }

  async extractReceipt(
    bytes: Uint8Array,
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
    accountCurrency: ExpenseCurrency,
  ): Promise<ExtractedReceiptExpense> {
    const key = this.apiKey();
    const response = await this.requestJson<OpenAiResponse>(
      `${OPENAI_API_URL}/responses`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model:
            this.config.get<string>('OPENAI_TELEGRAM_VISION_MODEL')?.trim() ||
            OPENAI_TELEGRAM_VISION_MODEL,
          store: false,
          max_output_tokens: 400,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text:
                    'Extract one expense from this receipt. Use the final amount paid, not a subtotal. ' +
                    'Do not convert currencies. Return UNKNOWN when the currency cannot be read. ' +
                    'Use an empty date when it is absent or ambiguous.',
                },
                {
                  type: 'input_image',
                  image_url: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`,
                  detail: 'high',
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'receipt_expense',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  merchant: { type: 'string', maxLength: 120 },
                  amount: {
                    type: 'string',
                    pattern: '^(0|[1-9][0-9]{0,11})(\\.[0-9]{1,2})?$',
                  },
                  currency: { type: 'string', enum: ['USD', 'KHR', 'UNKNOWN'] },
                  category: { type: 'string', enum: RECEIPT_CATEGORIES },
                  date: { type: 'string', maxLength: 10 },
                  confidence: { type: 'integer', minimum: 0, maximum: 100 },
                },
                required: [
                  'merchant',
                  'amount',
                  'currency',
                  'category',
                  'date',
                  'confidence',
                ],
              },
            },
          },
        }),
      },
    );

    const raw = this.outputText(response);
    let receipt: ReceiptExtraction;
    try {
      receipt = JSON.parse(raw) as ReceiptExtraction;
    } catch {
      throw new TelegramAssistantAiProcessingError(
        'The receipt result was invalid.',
      );
    }
    this.validateReceipt(receipt, accountCurrency);

    return {
      expense: {
        amount: receipt.amount,
        currency: accountCurrency,
        category: receipt.category,
        note: receipt.merchant.trim().slice(0, 500) || 'Receipt',
      },
      ...(this.isIsoDate(receipt.date) ? { entryDate: receipt.date } : {}),
      confidence: receipt.confidence,
    };
  }

  private apiKey() {
    const key = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!key || /^(dummy_|replace_)/i.test(key)) {
      throw new TelegramAssistantAiUnavailableError(
        'AI expense capture is not configured.',
      );
    }
    return key;
  }

  private async requestJson<T>(url: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch {
      // Provider details can include sensitive request metadata, so callers get a stable error only.
      throw new TelegramAssistantAiProcessingError(
        'AI expense capture is temporarily unavailable.',
      );
    }
    if (!response.ok) {
      throw new TelegramAssistantAiProcessingError(
        'AI expense capture is temporarily unavailable.',
      );
    }
    try {
      return (await response.json()) as T;
    } catch {
      throw new TelegramAssistantAiProcessingError(
        'AI expense capture returned an invalid response.',
      );
    }
  }

  private outputText(response: OpenAiResponse) {
    const text = response.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === 'output_text')?.text;
    if (!text) {
      throw new TelegramAssistantAiProcessingError(
        'No receipt details were found.',
      );
    }
    return text;
  }

  private validateReceipt(
    receipt: ReceiptExtraction,
    accountCurrency: ExpenseCurrency,
  ) {
    if (
      !receipt ||
      !RECEIPT_CATEGORIES.includes(receipt.category) ||
      !/^(0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(receipt.amount) ||
      Number(receipt.amount) <= 0 ||
      !Number.isInteger(receipt.confidence) ||
      receipt.confidence < 0 ||
      receipt.confidence > 100
    ) {
      throw new TelegramAssistantAiProcessingError(
        'The receipt details could not be verified.',
      );
    }
    if (receipt.currency === 'UNKNOWN') {
      throw new TelegramAssistantAiProcessingError(
        'The receipt currency was unclear. Send the expense as text instead.',
      );
    }
    if (receipt.currency !== accountCurrency) {
      throw new TelegramAssistantAiProcessingError(
        `This tracker uses ${accountCurrency}; the receipt uses ${receipt.currency}.`,
      );
    }
  }

  private isIsoDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

  private audioFilename(mimeType: string) {
    if (mimeType.includes('webm')) return 'expense.webm';
    if (mimeType.includes('mpeg')) return 'expense.mp3';
    if (mimeType.includes('wav')) return 'expense.wav';
    return 'expense.ogg';
  }

  private toArrayBuffer(bytes: Uint8Array) {
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }
}
