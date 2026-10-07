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
import { SecurityService } from './security.service';
import { TelegramBusinessSecurityService } from './telegram-business-security.service';
import { TelegramBusinessSecurityAlertsService } from './telegram-business-security-alerts.service';
import { ClamavService } from './clamav.service';
import { TelegramFileSecurityService } from './telegram-file-security.service';
import { TelegramUrlSecurityService } from './telegram-url-security.service';

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
    SecurityService,
    ClamavService,
    TelegramFileSecurityService,
    TelegramUrlSecurityService,
    TelegramBusinessSecurityService,
    TelegramBusinessSecurityAlertsService,
  ],
  exports: [TelegramBotClient, TelegramAssistantAiService],
})
export class TelegramBotModule {}
