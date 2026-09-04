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
const TELEGRAM_FILE_PATH_PATTERN =
  /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]{1,512}$/;

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

  async isChatAdministrator(chatId: number, userId: number) {
    const result = (await this.call('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    })) as { status?: string } | undefined;
    return result?.status === 'creator' || result?.status === 'administrator';
  }

  setChatMenuButton(chatId: number, text: string, webAppUrl: string) {
    return this.call('setChatMenuButton', {
      chat_id: chatId,
      menu_button: { type: 'web_app', text, web_app: { url: webAppUrl } },
    });
  }

  async sendChatAction(chatId: number, action: 'typing' | 'upload_photo') {
    try {
      return await this.call('sendChatAction', { chat_id: chatId, action });
    } catch {
      // Processing still continues when Telegram cannot display a temporary action.
      return undefined;
    }
  }

  async downloadFile(fileId: string, maxBytes: number) {
    if (!fileId || fileId.length > 256 || maxBytes <= 0) {
      throw new BadRequestException('Telegram file is invalid');
    }
    const file = (await this.call('getFile', { file_id: fileId })) as
      { file_path?: string; file_size?: number } | undefined;
    if (
      !file?.file_path ||
      !TELEGRAM_FILE_PATH_PATTERN.test(file.file_path) ||
      (file.file_size !== undefined && file.file_size > maxBytes)
    ) {
      throw new BadRequestException(
        'Telegram file is unavailable or too large',
      );
    }

    const token = this.config.getOrThrow<string>('TELEGRAM_BOT_TOKEN');
    let response: Response;
    try {
      response = await fetch(
        `https://api.telegram.org/file/bot${token}/${file.file_path}`,
        { signal: AbortSignal.timeout(15_000) },
      );
    } catch {
      throw new ServiceUnavailableException('Telegram file download failed');
    }
    if (!response.ok) {
      throw new ServiceUnavailableException('Telegram file download failed');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > maxBytes) {
      throw new BadRequestException(
        'Telegram file is unavailable or too large',
      );
    }
    return bytes;
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
