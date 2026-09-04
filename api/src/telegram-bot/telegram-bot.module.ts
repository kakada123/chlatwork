import { Module } from '@nestjs/common';
import { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  controllers: [TelegramBotController],
  providers: [TelegramBotClient, TelegramBotService],
})
export class TelegramBotModule {}
