import {
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AiFeature } from '@prisma/client';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/types';
import { VideoGenerateDto } from './dto/creator-ai.dto';
import { CreatorVideoService } from './creator-video.service';
import {
  CreatorVideoUploadFeature,
  CreatorVideoUploadTicketGuard,
  type CreatorDirectUploadRequest,
} from './creator-video-upload-ticket.guard';
import {
  creatorVideoUploadOptions,
  CreatorVideoUploadExceptionFilter,
  type CreatorVideoUpload,
} from './creator-video-upload';

@Controller('creator-ai/direct')
@UseGuards(CreatorVideoUploadTicketGuard)
@UseFilters(CreatorVideoUploadExceptionFilter)
@Throttle({ default: { limit: 12, ttl: 60_000 } })
export class CreatorVideoDirectUploadController {
  constructor(private readonly videos: CreatorVideoService) {}

  @Post('video/subtitle')
  @CreatorVideoUploadFeature(AiFeature.VIDEO_SUBTITLE)
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  subtitle(
    @CurrentAuthUser() user: CurrentUser,
    @Req() request: CreatorDirectUploadRequest,
    @Body() dto: VideoGenerateDto,
    @UploadedFile() file?: CreatorVideoUpload,
  ) {
    return this.create(user, request, AiFeature.VIDEO_SUBTITLE, dto, file);
  }

  @Post('video/caption')
  @CreatorVideoUploadFeature(AiFeature.VIDEO_CAPTION)
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  caption(
    @CurrentAuthUser() user: CurrentUser,
    @Req() request: CreatorDirectUploadRequest,
    @Body() dto: VideoGenerateDto,
    @UploadedFile() file?: CreatorVideoUpload,
  ) {
    return this.create(user, request, AiFeature.VIDEO_CAPTION, dto, file);
  }

  @Post('video/summary')
  @CreatorVideoUploadFeature(AiFeature.VIDEO_SUMMARY)
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  summary(
    @CurrentAuthUser() user: CurrentUser,
    @Req() request: CreatorDirectUploadRequest,
    @Body() dto: VideoGenerateDto,
    @UploadedFile() file?: CreatorVideoUpload,
  ) {
    return this.create(user, request, AiFeature.VIDEO_SUMMARY, dto, file);
  }

  @Post('video/content-pack')
  @CreatorVideoUploadFeature(AiFeature.VIDEO_CONTENT_PACK)
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  contentPack(
    @CurrentAuthUser() user: CurrentUser,
    @Req() request: CreatorDirectUploadRequest,
    @Body() dto: VideoGenerateDto,
    @UploadedFile() file?: CreatorVideoUpload,
  ) {
    return this.create(user, request, AiFeature.VIDEO_CONTENT_PACK, dto, file);
  }

  @Post('repurpose/video-to-social')
  @CreatorVideoUploadFeature(AiFeature.VIDEO_TO_SOCIAL)
  @UseInterceptors(FileInterceptor('file', creatorVideoUploadOptions))
  videoToSocial(
    @CurrentAuthUser() user: CurrentUser,
    @Req() request: CreatorDirectUploadRequest,
    @Body() dto: VideoGenerateDto,
    @UploadedFile() file?: CreatorVideoUpload,
  ) {
    return this.create(user, request, AiFeature.VIDEO_TO_SOCIAL, dto, file);
  }

  private create(
    user: CurrentUser,
    request: CreatorDirectUploadRequest,
    feature: AiFeature,
    dto: VideoGenerateDto,
    file?: CreatorVideoUpload,
  ) {
    return this.videos.createJob(
      user.id,
      feature,
      request.creatorVideoUpload.idempotencyKey,
      { ...dto },
      file,
    );
  }
}
