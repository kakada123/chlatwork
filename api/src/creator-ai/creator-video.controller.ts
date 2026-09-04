import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AiFeature } from '@prisma/client';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { VideoGenerateDto } from './dto/creator-ai.dto';
import { CreatorVideoService } from './creator-video.service';
import {
  creatorVideoUploadOptions,
  CreatorVideoUploadExceptionFilter,
  type CreatorVideoUpload,
} from './creator-video-upload';

@Controller('creator-ai')
@UseGuards(JwtAuthGuard)
@UseFilters(CreatorVideoUploadExceptionFilter)
@Throttle({ default: { limit: 12, ttl: 60_000 } })
export class CreatorVideoController {
  constructor(private readonly videos: CreatorVideoService) {}

  @Post('video/subtitle')
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  subtitle(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: VideoGenerateDto, @UploadedFile() file?: CreatorVideoUpload) {
    return this.videos.createJob(user.id, AiFeature.VIDEO_SUBTITLE, key, { ...dto }, file);
  }

  @Post('video/caption')
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  caption(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: VideoGenerateDto, @UploadedFile() file?: CreatorVideoUpload) {
    return this.videos.createJob(user.id, AiFeature.VIDEO_CAPTION, key, { ...dto }, file);
  }

  @Post('video/summary')
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  summary(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: VideoGenerateDto, @UploadedFile() file?: CreatorVideoUpload) {
    return this.videos.createJob(user.id, AiFeature.VIDEO_SUMMARY, key, { ...dto }, file);
  }

  @Post('video/content-pack')
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  contentPack(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: VideoGenerateDto, @UploadedFile() file?: CreatorVideoUpload) {
    return this.videos.createJob(user.id, AiFeature.VIDEO_CONTENT_PACK, key, { ...dto }, file);
  }

  @Post('repurpose/video-to-social')
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  videoToSocial(@CurrentAuthUser() user: CurrentUser, @Headers('idempotency-key') key: string | undefined, @Body() dto: VideoGenerateDto, @UploadedFile() file?: CreatorVideoUpload) {
    return this.videos.createJob(user.id, AiFeature.VIDEO_TO_SOCIAL, key, { ...dto }, file);
  }

  @Get('video/jobs/:id')
  job(@CurrentAuthUser() user: CurrentUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.videos.getJob(user.id, id);
  }

  @Get('video/jobs/:id/subtitles')
  subtitles(@CurrentAuthUser() user: CurrentUser, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.videos.subtitles(user.id, id);
  }
}
