import { forwardRef, Module } from '@nestjs/common';
import { MomentsModule } from '../moments/moments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TelegramBotClient } from './telegram-bot.client';
import { TelegramBotController } from './telegram-bot.controller';
import { TelegramBotService } from './telegram-bot.service';
import { DailyMomentVoteScheduler } from './daily-moment-vote.scheduler';
import { TelegramAssistantAiService } from './telegram-assistant-ai.service';
import { TelegramFinanceScheduler } from './telegram-finance.scheduler';
import { TelegramMemberQrScheduler } from './telegram-member-qr.scheduler';
import { PersonalAssistantModule } from '../personal-assistant/personal-assistant.module';
import { TelegramKlaKlokService } from './telegram-kla-klok.service';

@Module({
  imports: [
    MomentsModule,
    NotificationsModule,
    forwardRef(() => PersonalAssistantModule),
  ],
  controllers: [TelegramBotController],
  providers: [
    TelegramBotClient,
    TelegramBotService,
    TelegramAssistantAiService,
    DailyMomentVoteScheduler,
    TelegramFinanceScheduler,
    TelegramMemberQrScheduler,
    TelegramKlaKlokService,
  ],
  exports: [TelegramBotClient, TelegramAssistantAiService],
})
export class TelegramBotModule {}
