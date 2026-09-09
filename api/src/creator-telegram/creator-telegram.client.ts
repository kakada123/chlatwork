import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';

@Injectable()
export class CreatorTelegramClient extends TelegramBotClient {
  protected override readonly tokenConfigKey = 'CREATOR_TELEGRAM_BOT_TOKEN';

  constructor(config: ConfigService) {
    super(config);
  }
}
