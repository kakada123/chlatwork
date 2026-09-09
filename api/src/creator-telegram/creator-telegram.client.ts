import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';

@Injectable()
export class CreatorTelegramClient extends TelegramBotClient {
  protected override readonly tokenConfigKey = 'CREATOR_TELEGRAM_BOT_TOKEN';

  constructor(config: ConfigService) {
    super(config);
  }

  sendCopyableMessage(chatId: number, text: string) {
    // Explicit entities preserve Khmer, backticks and markup characters verbatim.
    return this.sendMessage(chatId, text, undefined, [
      { type: 'pre', offset: 0, length: text.length, language: 'copy' },
    ]);
  }
}
