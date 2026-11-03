import {
  Body,
  Controller,
  Delete,
  Get,
  Head,
  Header,
  Headers,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentAuthUser, OptionalCurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreateMomentDto } from './dto/create-moment.dto';
import { CreateInvitationGuestsDto } from './dto/create-invitation-guests.dto';
import { RespondMomentRsvpDto } from './dto/respond-moment-rsvp.dto';
import { RespondMomentVoteDto } from './dto/respond-moment-vote.dto';
import { UpdateMomentPollOptionsDto } from './dto/update-moment-poll-options.dto';
import { GenerateBirthdayWishDto } from './dto/generate-birthday-wish.dto';
import { BirthdayWishService } from './birthday-wish.service';
import { BirthdayWishRateLimitGuard } from './birthday-wish-rate-limit.guard';
import { BirthdayAudioService } from './birthday-audio.service';
import { BirthdayMomentEditorService, MAX_BIRTHDAY_EDIT_PAYLOAD_BYTES } from './birthday-moment-editor.service';
import {
  MAX_MOMENT_IMAGE_BYTES,
  MomentsService,
  type MomentUpload,
} from './moments.service';

@Controller('moments')
export class MomentsController {
  constructor(
    private readonly moments: MomentsService,
    private readonly birthdayWishes: BirthdayWishService,
    private readonly birthdayAudio: BirthdayAudioService,
    private readonly birthdayEditor: BirthdayMomentEditorService,
  ) {}

  @Get(':id/edit')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  getBirthdayMomentForEdit(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.birthdayEditor.get(user.id, id);
  }

  @Get(':id/edit/media/:mediaId')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'image/webp')
  @Header('X-Content-Type-Options', 'nosniff')
  async getBirthdayMomentEditorMedia(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
  ) {
    return new StreamableFile(await this.birthdayEditor.getMedia(user.id, id, mediaId));
  }

  @Put(':id/edit')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  @UseInterceptors(FilesInterceptor('files', 10, {
    limits: { fileSize: MAX_MOMENT_IMAGE_BYTES, files: 10, fields: 1, fieldSize: MAX_BIRTHDAY_EDIT_PAYLOAD_BYTES, parts: 11 },
  }))
  updateBirthdayMoment(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('payload') payload: string,
    @UploadedFiles() files?: MomentUpload[],
  ) {
    return this.birthdayEditor.update(user.id, id, payload, files ?? []);
  }

  @Get('birthday-audio')
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=300')
  listBirthdayAudio() {
    return this.birthdayAudio.listTracks();
  }

  @Head('birthday-audio/:trackId')
  @SkipThrottle()
  async headBirthdayAudio(
    @Param('trackId') trackId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const audio = await this.birthdayAudio.openTrack(trackId, undefined, true);
    response.status(audio.statusCode);
    for (const [name, value] of Object.entries(audio.headers)) {
      response.setHeader(name, value);
    }
  }

  @Get('birthday-audio/:trackId')
  @SkipThrottle()
  async getBirthdayAudio(
    @Param('trackId') trackId: string,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const audio = await this.birthdayAudio.openTrack(trackId, range);
    response.status(audio.statusCode);
    for (const [name, value] of Object.entries(audio.headers)) {
      response.setHeader(name, value);
    }
    if (!audio.stream) return;
    const stream = audio.stream;
    response.once('close', () => stream.destroy());
    return new StreamableFile(stream)
      .setErrorHandler((_error, reply) => {
        if (reply.destroyed) return;
        if (reply.headersSent) {
          reply.end();
          return;
        }
        // A late disk failure must not expose the asset path or cache a partial audio response.
        response.removeHeader('Content-Range');
        response.removeHeader('Content-Length');
        response.setHeader('Content-Type', 'text/plain; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        reply.statusCode = 503;
        reply.send('Birthday audio is temporarily unavailable.');
      })
      .setErrorLogger(() => undefined);
  }

  @Post('birthday-wish')
  @UseGuards(JwtAuthGuard, BirthdayWishRateLimitGuard)
  @Header('Cache-Control', 'no-store')
  generateBirthdayWish(@Body() dto: GenerateBirthdayWishDto) {
    return this.birthdayWishes.generate(dto);
  }

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

  @Put(':id/poll-options/:optionId/image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MOMENT_IMAGE_BYTES, files: 1 } }))
  setPollOptionImage(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('optionId') optionId: string,
    @UploadedFile() file?: MomentUpload,
  ) {
    return this.moments.setPollOptionImage(user.id, id, optionId, file);
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

  @Delete(':id/votes')
  @UseGuards(JwtAuthGuard)
  resetVotes(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.moments.resetVotes(user.id, id);
  }

  @Patch(':id/poll-options')
  @UseGuards(JwtAuthGuard)
  updatePollOptions(
    @CurrentAuthUser() user: CurrentUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMomentPollOptionsDto,
  ) {
    return this.moments.updatePollOptions(user.id, id, dto);
  }

  @Get(':slug/media/:mediaId')
  async getMedia(
    @Param('slug') slug: string,
    @Param('mediaId', new ParseUUIDPipe({ version: '4' })) mediaId: string,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const media = await this.moments.getPublicMedia(slug, mediaId, format === 'jpeg');
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

  @Post(':slug/vote')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(OptionalJwtAuthGuard)
  respondToVote(
    @Param('slug') slug: string,
    @Body() dto: RespondMomentVoteDto,
    @OptionalCurrentAuthUser() user: CurrentUser | null,
  ) {
    return this.moments.respondToVote(slug, dto, user);
  }
}
