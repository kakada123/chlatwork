import { Module } from '@nestjs/common';
import { MomentsModule } from '../moments/moments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotService } from './telegram-bot.service';
import { DailyMomentVoteScheduler } from './daily-moment-vote.scheduler';
import { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramFinanceScheduler } from './telegram-finance.scheduler';

@Module({
  imports: [MomentsModule, NotificationsModule],
  controllers: [TelegramBotController],
  providers: [
    TelegramBotClient,
    TelegramBotService,
    TelegramAssistantAiService,
    DailyMomentVoteScheduler,
    TelegramFinanceScheduler,
  ],
})
export class TelegramBotModule {}
