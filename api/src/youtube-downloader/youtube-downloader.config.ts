import type { ConfigService } from '@nestjs/config';
import { YoutubeDownloaderError } from './youtube-downloader.errors';

export function readYoutubeDownloaderConfig(config: ConfigService) {
  const enabled = config.get<string>('YOUTUBE_DOWNLOADER_ENABLED') === 'true';
  const configuredOrigin = config.get<string>('YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL')?.trim();
  let publicBaseUrl: string | null = null;
  if (enabled) {
    try {
      const url = new URL(configuredOrigin || '');
      const local =
        config.get<string>('NODE_ENV') !== 'production' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
      )
        throw new Error();
      publicBaseUrl = url.origin;
    } catch {
      throw new YoutubeDownloaderError('UNAVAILABLE', 503);
    }
  }
  const executable = (key: string, fallback: string) => {
    const value = config.get<string>(key)?.trim() || fallback;
    if (/[\u0000-\u001f\u007f]/.test(value)) throw new YoutubeDownloaderError('UNAVAILABLE', 503);
    return value;
  };
  return {
    enabled,
    publicBaseUrl,
    ytdlpPath: executable('YOUTUBE_DOWNLOADER_YTDLP_PATH', 'yt-dlp'),
    ffmpegPath: executable('FFMPEG_PATH', 'ffmpeg'),
    ffprobePath: executable('FFPROBE_PATH', 'ffprobe'),
  };
}
