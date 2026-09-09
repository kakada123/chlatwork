import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';

@Injectable()
export class CreatorTelegramClient extends TelegramBotClient {
  protected override readonly tokenConfigKey = 'CREATOR_TELEGRAM_BOT_TOKEN';

  constructor(config: ConfigService) {
    super(config);
  }

  async sendStatus(chatId: number, text: string): Promise<number | null> {
    try {
      const message = await this.sendMessage(chatId, text);
      return message.message_id;
    } catch {
      // Optional feedback must never block a queued generation or cause a charge.
      return null;
    }
  }

  async updateStatus(chatId: number, messageId: number | null, text: string) {
    if (messageId === null) return;
    try {
      await this.editMessage(chatId, messageId, text);
    } catch {
      // The user may have deleted the status; do not send replacement spam.
    }
  }

  async clearStatus(
    chatId: number,
    messageId: number | null,
    fallback: string,
  ) {
    if (messageId === null) return;
    try {
      await this.deleteMessage(chatId, messageId);
    } catch {
      await this.updateStatus(chatId, messageId, fallback);
    }
  }

  sendCopyableMessage(chatId: number, text: string) {
    // Explicit entities preserve Khmer, backticks and markup characters verbatim.
    return this.sendMessage(chatId, text, undefined, [
      { type: 'pre', offset: 0, length: text.length, language: 'copy' },
    ]);
  }
}
