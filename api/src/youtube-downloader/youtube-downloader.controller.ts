import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { CurrentAuthUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser } from '../auth/types';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import { CreateYoutubeJobDto } from './dto/create-youtube-job.dto';
import { YoutubePreviewDto } from './dto/youtube-preview.dto';
import { readYoutubeDownloaderConfig } from './youtube-downloader.config';
import { YoutubeDownloaderError } from './youtube-downloader.errors';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import { YoutubeDownloaderService } from './youtube-downloader.service';

@Controller('youtube-downloader')
export class YoutubeDownloaderController {
  constructor(
    private readonly config: ConfigService,
    private readonly downloader: YoutubeDownloaderService,
    private readonly availability: FeatureAvailabilityService,
    private readonly runner: YoutubeDownloaderRunner,
  ) {}

  private async enabled(checkDependencies = true) {
    try {
      const settings = readYoutubeDownloaderConfig(this.config);
      if (!settings.enabled || !(await this.availability.isEnabled('website:youtube-downloader')))
        throw new YoutubeDownloaderError('UNAVAILABLE', 503);
      if (checkDependencies) await this.runner.assertAvailable();
      return settings;
    } catch {
      // Config, database and dependency diagnostics must not become public error details.
      throw new YoutubeDownloaderError('UNAVAILABLE', 503);
    }
  }

  @Post('preview')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  @UseGuards(JwtAuthGuard)
  async preview(@CurrentAuthUser() user: CurrentUser, @Body() dto: YoutubePreviewDto) {
    await this.enabled();
    return this.downloader.preview(user.id, dto.url);
  }

  @Post('jobs')
  @HttpCode(202)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { ttl: 60_000, limit: 4 } })
  @UseGuards(JwtAuthGuard)
  async create(@CurrentAuthUser() user: CurrentUser, @Body() dto: CreateYoutubeJobDto) {
    await this.enabled();
    return this.downloader.createJob(user.id, dto.url, dto.quality);
  }

  @Get('jobs/:id')
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  async status(@CurrentAuthUser() user: CurrentUser, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.enabled(false);
    return this.downloader.getJob(user.id, id);
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  @UseGuards(JwtAuthGuard)
  async cancel(@CurrentAuthUser() user: CurrentUser, @Param('id', new ParseUUIDPipe()) id: string) {
    await this.enabled(false);
    await this.downloader.cancelJob(user.id, id);
  }

  @Post('jobs/:id/ticket')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  async ticket(@CurrentAuthUser() user: CurrentUser, @Param('id', new ParseUUIDPipe()) id: string) {
    const settings = await this.enabled(false);
    const ticket = this.downloader.issueTicket(user.id, id);
    return {
      downloadUrl: `${settings.publicBaseUrl}/youtube-downloader/files/${ticket.token}`,
      expiresAt: ticket.expiresAt,
    };
  }

  @Get('files/:ticket')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async download(@Param('ticket') ticket: string, @Res() response: Response) {
    await this.enabled(false);
    const lease = this.downloader.leaseDownload(ticket);
    const stream = createReadStream(lease.path);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      stream.destroy();
      void lease.release().catch(() => undefined);
    };
    response.once('finish', release);
    response.once('close', release);
    stream.once('error', () => {
      release();
      if (response.headersSent) response.destroy();
      else {
        response.removeHeader('Content-Length');
        response.removeHeader('Content-Disposition');
        response.removeHeader('Content-Type');
        response
          .status(502)
          .json({
            code: 'DOWNLOAD_FAILED',
            message: 'The download is unavailable. Please prepare it again.',
          });
      }
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', 'video/mp4');
    response.setHeader('Content-Length', lease.sizeBytes);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(lease.fileName)}`,
    );
    // The stream bypasses Nuxt/Vercel response-size limits; its ticket never reveals an account JWT.
    stream.pipe(response);
  }
}
