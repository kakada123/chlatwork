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
@Module({
  imports: [AuthModule, BotAccessModule, GroupAccessModule],
  controllers: [GroupWorkspacesController, GroupPollMediaController],
  providers: [
    GroupConnectionsService,
    GroupWorkspaceService,
    GroupVoteService,
    GroupPollMediaService,
  ],
  exports: [GroupConnectionsService, GroupPollMediaService, GroupAccessModule],
})
export class GroupWorkspacesModule {}
