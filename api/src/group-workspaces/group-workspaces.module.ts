import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BotAccessModule } from '../bot-admin/bot-access.module';
import { GroupAccessModule } from './group-access.module';
import { GroupConnectionsService } from './group-connections.service';
import { GroupWorkspaceService } from './group-workspace.service';
import { GroupVoteService } from './group-vote.service';
import { GroupPollMediaService } from './group-poll-media.service';
import { GroupPollMediaController } from './group-poll-media.controller';
import { GroupWorkspacesController } from './group-workspaces.controller';
import { MomentsModule } from '../moments/moments.module';
import { DailyMomentVoteScheduler } from '../telegram-bot/daily-moment-vote.scheduler';
import { TelegramBotClient } from '../telegram-bot/telegram-bot.client';
@Module({
  imports: [AuthModule, BotAccessModule, GroupAccessModule, MomentsModule],
  controllers: [GroupWorkspacesController, GroupPollMediaController],
  providers: [
    GroupConnectionsService,
    GroupWorkspaceService,
    GroupVoteService,
    GroupPollMediaService,
    // HTTP resets and private bot controls must share one delivery worker.
    DailyMomentVoteScheduler,
    TelegramBotClient,
  ],
  exports: [
    GroupConnectionsService,
    GroupPollMediaService,
    GroupAccessModule,
    DailyMomentVoteScheduler,
    GroupVoteService,
  ],
})
export class GroupWorkspacesModule {}
