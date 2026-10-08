import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YoutubeDownloaderController } from './youtube-downloader.controller';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import { YoutubeDownloaderService } from './youtube-downloader.service';

@Module({
  imports: [AuthModule],
  controllers: [YoutubeDownloaderController],
  providers: [YoutubeDownloaderRunner, YoutubeDownloaderService],
})
export class YoutubeDownloaderModule {}
