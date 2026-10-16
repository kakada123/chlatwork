import {
  GroupQuery,
  GroupStatusInput,
} from '../group-workspaces/group-workspaces.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/types';
import { BotAdminService } from './bot-admin.service';
import { BotUsersQuery, ReviewBotUser } from './bot-admin.dto';
import { BotKhqrService, BOT_QR_MAX_BYTES } from './bot-khqr.service';

@Controller('admin/bots')
@UseGuards(JwtAuthGuard, AdminGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class BotAdminController {
  constructor(
    private readonly admin: BotAdminService,
    private readonly qr: BotKhqrService,
  ) {}

  @Get('groups')
  @Header('Cache-Control', 'no-store')
  groups(@Query() q: GroupQuery) {
    return this.admin.groups(q.page);
  }
  @Get('groups/:id')
  @Header('Cache-Control', 'no-store')
  groupDetails(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.admin.groupDetails(id);
  }
  @Post('groups/:id/status')
  groupStatus(
    @CurrentAuthUser() actor: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') key: string,
    @Body() input: GroupStatusInput,
  ) {
    return this.admin.groupStatus(actor.id, id, key, input);
  }

  @Get('overview')
  @Header('Cache-Control', 'no-store')
  overview(@Query() query: BotUsersQuery) {
    return this.admin.overview(query.bot);
  }

  @Get('users')
  @Header('Cache-Control', 'no-store')
  users(@Query() query: BotUsersQuery) {
    return this.admin.users(query);
  }

  @Get('users/:id')
  @Header('Cache-Control', 'no-store')
  details(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.admin.details(id);
  }

  @Post('users/:id/review')
  review(
    @CurrentAuthUser() actor: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Headers('idempotency-key') key: string,
    @Body() input: ReviewBotUser,
  ) {
    return this.admin.review(actor.id, id, key, input);
  }

  @Post('users/:id/khqr')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: BOT_QR_MAX_BYTES, files: 1, fields: 0, parts: 2 },
    }),
  )
  upload(
    @CurrentAuthUser() actor: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file?: { buffer: Buffer },
  ) {
    return this.qr.adminSave(actor.id, id, file?.buffer ?? Buffer.alloc(0));
  }

  @Delete('users/:id/khqr')
  remove(
    @CurrentAuthUser() actor: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.qr.adminSave(actor.id, id, null);
  }
}
