import { GroupFeaturePolicy } from './group-feature-policy';
import { Module } from '@nestjs/common';
import { BotAccessModule } from '../bot-admin/bot-access.module';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
import { CreatorTelegramClient } from '../creator-telegram/creator-telegram.client';
import { GroupAccessService } from './group-access.service';

@Module({
  imports: [BotAccessModule],
  providers: [
    TelegramBotClient,
    CreatorTelegramClient,
    GroupAccessService,
    GroupFeaturePolicy,
  ],
  exports: [GroupAccessService, GroupFeaturePolicy],
})
export class GroupAccessModule {}
