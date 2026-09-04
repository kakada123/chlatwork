import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TelegramApiResponse,
  TelegramInlineKeyboard,
} from './telegram-bot.types';

const TELEGRAM_MESSAGE_MAX_LENGTH = 4_096;

@Injectable()
export class TelegramBotClient {
  constructor(private readonly config: ConfigService) {}

  sendMessage(
    chatId: number,
    text: string,
    replyMarkup?: TelegramInlineKeyboard,
  ) {
    if (!text.trim() || text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Telegram bot message is invalid');
    }
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  editMessage(
    chatId: number,
    messageId: number,
    text: string,
    replyMarkup?: TelegramInlineKeyboard,
  ) {
    if (!text.trim() || text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Telegram bot message is invalid');
    }
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
  }

  editInlineMessage(
    inlineMessageId: string,
    text: string,
    replyMarkup: TelegramInlineKeyboard,
  ) {
    if (!text.trim() || text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Telegram bot message is invalid');
    }
    return this.call('editMessageText', {
      inline_message_id: inlineMessageId,
      text,
      reply_markup: replyMarkup,
    });
  }

  answerInlineQuery(
    inlineQueryId: string,
    results: Array<Record<string, unknown>>,
  ) {
    return this.call('answerInlineQuery', {
      inline_query_id: inlineQueryId,
      results,
      cache_time: 0,
      is_personal: true,
    });
  }

  async answerCallback(callbackQueryId: string, text?: string) {
    try {
      return await this.call('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        ...(text ? { text } : {}),
      });
    } catch {
      // Callback acknowledgements expire quickly and are only visual feedback;
      // a late acknowledgement must not retry an already-safe state change.
      return undefined;
    }
  }

  private async call(method: string, payload: Record<string, unknown>) {
    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    let response: Response;

    try {
      response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      // Provider failures stay generic because the request URL contains the bot token.
      throw new ServiceUnavailableException('Telegram bot request failed');
    }

    let result: TelegramApiResponse = {};
    try {
      result = (await response.json()) as TelegramApiResponse;
    } catch {
      // Malformed provider responses are handled like other delivery failures.
    }
    if (
      method === 'editMessageText' &&
      result.description?.toLowerCase().includes('message is not modified')
    ) {
      return result.result;
    }
    if (!response.ok || result.ok !== true) {
      throw new ServiceUnavailableException('Telegram bot request failed');
    }
    return result.result;
  }
}
