import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreateMomentDto } from './dto/create-moment.dto';
import { CreateInvitationGuestsDto } from './dto/create-invitation-guests.dto';
import { RespondMomentRsvpDto } from './dto/respond-moment-rsvp.dto';
import {
  MAX_MOMENT_IMAGE_BYTES,
  MomentsService,
  type MomentUpload,
} from './moments.service';

@Controller('moments')
export class MomentsController {
  constructor(private readonly moments: MomentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentAuthUser() user: CurrentUser, @Body() dto: CreateMomentDto) {
    return this.moments.create(user.id, dto);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_MOMENT_IMAGE_BYTES, files: 1 },
    }),
  )
  addMedia(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file?: MomentUpload,
  ) {
    return this.moments.addMedia(user.id, id, file);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moments.publish(user.id, id);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentAuthUser() user: CurrentUser) {
    return this.moments.listMine(user.id);
  }

  @Post(':id/guests')
  @UseGuards(JwtAuthGuard)
  addInvitationGuests(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateInvitationGuestsDto,
  ) {
    return this.moments.addInvitationGuests(user.id, id, dto);
  }

  @Get(':id/guests')
  @UseGuards(JwtAuthGuard)
  listInvitationGuests(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moments.listInvitationGuests(user.id, id);
  }

  @Post(':id/guests/:guestId/sent')
  @UseGuards(JwtAuthGuard)
  markInvitationGuestSent(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('guestId', new ParseUUIDPipe({ version: '4' })) guestId: string,
  ) {
    return this.moments.markInvitationGuestSent(user.id, id, guestId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moments.remove(user.id, id);
  }

  @Get(':slug/media/:mediaId')
  async getMedia(
    @Param('slug') slug: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const media = await this.moments.getPublicMedia(slug, mediaId);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=86400');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(media.content);
  }

  @Get('invitations/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getPersonalInvitation(@Param('token') token: string) {
    return this.moments.getPersonalInvitation(token);
  }

  @Get(':slug')
  getPublic(@Param('slug') slug: string) {
    return this.moments.getPublic(slug);
  }

  @Post(':slug/rsvp')
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  respondToInvitation(
    @Param('slug') slug: string,
    @Body() dto: RespondMomentRsvpDto,
  ) {
    return this.moments.respondToInvitation(slug, dto);
  }
}
