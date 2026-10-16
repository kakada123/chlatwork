import { BotAdminModule } from '../bot-admin/bot-admin.module';
import { Module } from '@nestjs/common';
import { CreatorAiModule } from '../creator-ai/creator-ai.module';
import { CreatorTelegramClient } from './creator-telegram.client';
import { CreatorTelegramController } from './creator-telegram.controller';
import { CreatorTelegramService } from './creator-telegram.service';
import { CreatorTelegramWorker } from './creator-telegram.worker';

@Module({
  imports: [BotAdminModule, CreatorAiModule],
  controllers: [CreatorTelegramController],
  providers: [
    CreatorTelegramClient,
    CreatorTelegramService,
    CreatorTelegramWorker,
  ],
})
export class CreatorTelegramModule {}
