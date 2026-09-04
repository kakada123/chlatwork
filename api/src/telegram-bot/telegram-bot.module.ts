import { Module } from '@nestjs/common';
import { MomentsModule } from '../moments/moments.module';
import { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  imports: [MomentsModule],
  controllers: [TelegramBotController],
  providers: [TelegramBotClient, TelegramBotService],
})
export class TelegramBotModule {}
