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
import type { Response } from 'express';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { CreateMomentDto } from './dto/create-moment.dto';
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

  @Get(':slug')
  getPublic(@Param('slug') slug: string) {
    return this.moments.getPublic(slug);
  }
}
