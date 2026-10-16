import { BotPaidAiService } from './bot-paid-ai.service';
import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CreatorAiModule } from '../creator-ai/creator-ai.module';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { CreatorTelegramClient } from '../creator-telegram/creator-telegram.client';
import { BotAccessModule } from './bot-access.module';
import { BotAdminService } from './bot-admin.service';
import { BotAdminController } from './bot-admin.controller';
import { BotGatewayService } from './bot-gateway.service';
import { BotKhqrService } from './bot-khqr.service';
import { BotNotificationsService } from './bot-notifications.service';

@Module({
  imports: [CreatorAiModule, BotAccessModule],
  controllers: [BotAdminController],
  providers: [
    AdminGuard,
    TelegramBotClient,
    CreatorTelegramClient,
    BotAdminService,
    BotGatewayService,
    BotKhqrService,
    BotNotificationsService,
    BotPaidAiService,
  ],
  exports: [BotAccessModule, BotGatewayService, BotPaidAiService],
})
export class BotAdminModule {}
