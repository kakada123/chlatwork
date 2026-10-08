import { IsIn, IsInt } from 'class-validator';
import { YoutubePreviewDto } from './youtube-preview.dto';
import { YOUTUBE_QUALITIES, type YoutubeQuality } from '../youtube-downloader.types';

export class CreateYoutubeJobDto extends YoutubePreviewDto {
  @IsInt()
  @IsIn(YOUTUBE_QUALITIES)
  quality: YoutubeQuality;
}
