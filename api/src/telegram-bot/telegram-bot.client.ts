import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  TelegramApiResponse,
  TelegramInlineKeyboard,
  TelegramReplyMarkup,
  TelegramTextMention,
  TelegramPreformattedText,
  TelegramMessage,
  TelegramUser,
  TelegramBusinessConnection,
} from './telegram-bot.types';

const TELEGRAM_MESSAGE_MAX_LENGTH = 4_096;
const TELEGRAM_FILE_PATH_PATTERN =
  /^(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9_./-]{1,512}$/;

@Injectable()
export class TelegramBotClient {
  protected readonly tokenConfigKey: string = 'TELEGRAM_BOT_TOKEN';
  constructor(private readonly config: ConfigService) {}

  sendMessage(
    chatId: number,
    text: string,
    replyMarkup?: TelegramReplyMarkup,
    entities?: (TelegramTextMention | TelegramPreformattedText)[],
    replyToMessageId?: number,
    options?: { disableLinkPreview?: boolean },
  ) {
    if (!text.trim() || text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Telegram bot message is invalid');
    }
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      ...(options?.disableLinkPreview
        ? { link_preview_options: { is_disabled: true } }
        : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      ...(entities?.length ? { entities } : {}),
      ...(replyToMessageId ? { reply_parameters: {
        message_id: replyToMessageId, allow_sending_without_reply: true,
      } } : {}),
    }) as Promise<TelegramMessage>;
  }

  deleteMessage(chatId: number, messageId: number) {
    return this.call('deleteMessage', {
      chat_id: chatId,
      message_id: messageId,
    });
  }

  deleteMessages(chatId: number, messageIds: number[]) {
    // Telegram skips missing messages, making cleanup safe after manual deletion
    // or a retry following a successful deletion whose response was lost.
    return this.call('deleteMessages', {
      chat_id: chatId,
      message_ids: messageIds,
    });
  }

  getBusinessConnection(connectionId: string) {
    this.validateBusinessConnectionId(connectionId);
    return this.call('getBusinessConnection', {
      business_connection_id: connectionId,
    }) as Promise<TelegramBusinessConnection>;
  }

  sendBusinessMessage(connectionId: string, chatId: number, text: string) {
    this.validateBusinessReply(connectionId, chatId, text);
    // Managed chats require the Business connection; ordinary bot chats are a different recipient.
    return this.call('sendMessage', {
      business_connection_id: connectionId,
      chat_id: chatId,
      text,
    }) as Promise<TelegramMessage>;
  }

  editBusinessMessage(
    connectionId: string,
    chatId: number,
    messageId: number,
    text: string,
  ) {
    this.validateBusinessReply(connectionId, chatId, text);
    if (!Number.isSafeInteger(messageId) || messageId <= 0) {
      throw new BadRequestException('Telegram business message ID is invalid');
    }
    return this.call('editMessageText', {
      business_connection_id: connectionId,
      chat_id: chatId,
      message_id: messageId,
      text,
    }) as Promise<TelegramMessage>;
  }

  private validateBusinessReply(
    connectionId: string,
    chatId: number,
    text: string,
  ) {
    this.validateBusinessConnectionId(connectionId);
    if (
      !Number.isSafeInteger(chatId) ||
      chatId <= 0 ||
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > TELEGRAM_MESSAGE_MAX_LENGTH
    ) {
      throw new BadRequestException('Telegram business reply is invalid');
    }
  }

  async deleteBusinessMessages(connectionId: string, messageIds: number[]) {
    this.validateBusinessConnectionId(connectionId);
    if (
      !Array.isArray(messageIds) ||
      messageIds.length < 1 ||
      messageIds.length > 100 ||
      messageIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(messageIds).size !== messageIds.length
    ) {
      throw new BadRequestException(
        'Telegram business message IDs are invalid',
      );
    }
    const result = await this.call('deleteBusinessMessages', {
      business_connection_id: connectionId,
      message_ids: messageIds,
    });
    if (result !== true) {
      throw new ServiceUnavailableException(
        'Telegram business deletion failed',
      );
    }
    return true;
  }

  private validateBusinessConnectionId(connectionId: string) {
    if (
      typeof connectionId !== 'string' ||
      !connectionId.trim() ||
      connectionId.length > 256
    ) {
      throw new BadRequestException('Telegram business connection is invalid');
    }
  }

  sendPhoto(chatId: number, photoUrl: string, caption: string, replyToMessageId?: number) {
    return this.call('sendPhoto', {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      ...(replyToMessageId ? { reply_parameters: {
        message_id: replyToMessageId, allow_sending_without_reply: true,
      } } : {}),
    }) as Promise<TelegramMessage>;
  }

  sendAnimation(chatId: number, animationUrl: string, replyToMessageId: number) {
    return this.call('sendAnimation', {
      chat_id: chatId,
      animation: animationUrl,
      reply_parameters: {
        message_id: replyToMessageId,
        allow_sending_without_reply: true,
      },
    }) as Promise<TelegramMessage>;
  }

  editMessage(
    chatId: number,
    messageId: number,
    text: string,
    replyMarkup?: TelegramInlineKeyboard,
    options?: { disableLinkPreview?: boolean },
  ) {
    if (!text.trim() || text.length > TELEGRAM_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException('Telegram bot message is invalid');
    }
    return this.call('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...(options?.disableLinkPreview
        ? { link_preview_options: { is_disabled: true } }
        : {}),
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

  getChatMember(chatId: number, userId: number) {
    return this.call('getChatMember', {
      chat_id: chatId,
      user_id: userId,
    }) as Promise<{ user: TelegramUser; status: string; is_member?: boolean }>;
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
    if (
      typeof fileId !== 'string' ||
      !fileId.trim() ||
      fileId.length > 256 ||
      !Number.isSafeInteger(maxBytes) ||
      maxBytes <= 0
    ) {
      throw new BadRequestException('Telegram file is invalid');
    }
    const file = (await this.call('getFile', { file_id: fileId })) as
      { file_path?: string; file_size?: number } | undefined;
    if (
      !file?.file_path ||
      !TELEGRAM_FILE_PATH_PATTERN.test(file.file_path) ||
      (file.file_size !== undefined &&
        (!Number.isSafeInteger(file.file_size) ||
          file.file_size < 0 ||
          file.file_size > maxBytes))
    ) {
      throw new BadRequestException(
        'Telegram file is unavailable or too large',
      );
    }

    const token = this.config.getOrThrow<string>(this.tokenConfigKey);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let complete = false;
    try {
      const response = await fetch(
        `https://api.telegram.org/file/bot${token}/${file.file_path}`,
        { signal: AbortSignal.timeout(15_000), redirect: 'error' },
      );
      if (!response.ok || !response.body) {
        throw new ServiceUnavailableException('Telegram file download failed');
      }
      reader = response.body.getReader();
      const length = response.headers.get('content-length');
      if (
        length !== null &&
        (!/^\d+$/.test(length) || Number(length) > maxBytes)
      ) {
        throw new BadRequestException(
          'Telegram file is unavailable or too large',
        );
      }
      // A fixed buffer also bounds memory when a sender streams millions of tiny chunks.
      const bytes = new Uint8Array(maxBytes);
      let receivedBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          complete = true;
          break;
        }
        receivedBytes += value.length;
        // Enforce the real byte count before buffering; Content-Length is not a trusted limit.
        if (receivedBytes > maxBytes) {
          throw new BadRequestException(
            'Telegram file is unavailable or too large',
          );
        }
        bytes.set(value, receivedBytes - value.length);
      }
      if (!receivedBytes)
        throw new BadRequestException(
          'Telegram file is unavailable or too large',
        );
      return bytes.subarray(0, receivedBytes);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      // Body/redirect failures can contain the bot token URL; keep all download errors generic.
      throw new ServiceUnavailableException('Telegram file download failed');
    } finally {
      if (reader) {
        if (!complete) await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
  }

  private async call(method: string, payload: Record<string, unknown>) {
    const token = this.config.getOrThrow<string>(this.tokenConfigKey);
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
