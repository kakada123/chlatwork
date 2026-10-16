import { GroupNoStoreInterceptor } from './group-no-store.interceptor';
import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BotAccessService } from '../bot-admin/bot-access.service';
import {
  MAX_MOMENT_IMAGE_BYTES,
  type MomentUpload,
} from '../moments/moments.service';
import { GroupConnectionsService } from './group-connections.service';
import { GroupWorkspaceService } from './group-workspace.service';
import { GroupVoteService } from './group-vote.service';
import { GroupPollMediaService } from './group-poll-media.service';
import {
  GroupFeaturesInput,
  GroupQuery,
  GroupResetInput,
  GroupVoteInput,
} from './group-workspaces.dto';

@Controller('bot/groups')
@UseGuards(JwtAuthGuard)
@UseInterceptors(GroupNoStoreInterceptor)
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class GroupWorkspacesController {
  constructor(
    private readonly workspaces: GroupWorkspaceService,
    private readonly connections: GroupConnectionsService,
    private readonly access: BotAccessService,
    private readonly votes: GroupVoteService,
    private readonly media: GroupPollMediaService,
  ) {}
  @Get('session') session(
    @CurrentAuthUser() user: CurrentUser,
    @Query() q: GroupQuery,
  ) {
    return this.workspaces.session(user.id, q.bot);
  }
  @Post('manager-request') async request(
    @CurrentAuthUser() user: CurrentUser,
    @Query() q: GroupQuery,
  ) {
    await this.access.ensureProfile(user.id, q.bot);
    return this.access.requestManagerAccess(user.id, q.bot);
  }
  @Post('connections') connect(
    @CurrentAuthUser() user: CurrentUser,
    @Query() q: GroupQuery,
  ) {
    return this.connections.request(user.id, q.bot);
  }
  @Get() list(@CurrentAuthUser() user: CurrentUser, @Query() q: GroupQuery) {
    return this.workspaces.list(user.id, q.bot, q.page);
  }
  @Get(':id') details(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: GroupQuery,
  ) {
    return this.workspaces.details(user.id, id, q.bot);
  }
  @Patch(':id/features') features(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: GroupQuery,
    @Body() input: GroupFeaturesInput,
    @Headers('idempotency-key') key: string,
  ) {
    return this.workspaces.features(user.id, id, q.bot, input, key);
  }
  @Put(':id/vote') vote(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: GroupVoteInput,
    @Headers('idempotency-key') key: string,
  ) {
    return this.votes.save(user.id, id, input, key);
  }
  @Put(':id/vote/options/:optionId/image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: MAX_MOMENT_IMAGE_BYTES,
        files: 1,
        fields: 0,
        parts: 2,
      },
    }),
  )
  upload(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('optionId') optionId: string,
    @Query('version', ParseIntPipe) version: number,
    @Headers('idempotency-key') key: string,
    @UploadedFile() file?: MomentUpload,
  ) {
    return this.media.upload(user.id, id, optionId, version, key, file);
  }
  @Post(':id/vote/reset') reset(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: GroupResetInput,
    @Headers('idempotency-key') key: string,
  ) {
    return this.votes.reset(user.id, id, input.expectedRoundId, key);
  }
  @Get(':id/vote/history') history(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: GroupQuery,
  ) {
    return this.votes.history(user.id, id, q.page);
  }
  @Get(':id/activity') activity(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: GroupQuery,
  ) {
    return this.workspaces.activity(user.id, id, q.bot, q.page);
  }
  @Get(':id/khqr') khqr(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() q: GroupQuery,
  ) {
    return this.workspaces.khqr(user.id, id, q.bot);
  }
}
