import { ConfigService } from '@nestjs/config';
import { readYoutubeDownloaderConfig } from './youtube-downloader.config';

describe('YouTube runtime configuration', () => {
  it('defaults to disabled with safe executable names', () => {
    expect(readYoutubeDownloaderConfig(new ConfigService({}))).toMatchObject({
      enabled: false,
      ytdlpPath: 'yt-dlp',
      ffmpegPath: 'ffmpeg',
      ffprobePath: 'ffprobe',
    });
  });
  test.each([
    '',
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com?ticket=x',
    'https://example.com/#x',
    'https://example.com/path',
  ])('rejects an unsafe production origin: %s', (origin) => {
    expect(() =>
      readYoutubeDownloaderConfig(
        new ConfigService({
          NODE_ENV: 'production',
          YOUTUBE_DOWNLOADER_ENABLED: 'true',
          YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL: origin,
        }),
      ),
    ).toThrow();
  });
  it('permits localhost HTTP only in development', () => {
    expect(
      readYoutubeDownloaderConfig(
        new ConfigService({
          NODE_ENV: 'development',
          YOUTUBE_DOWNLOADER_ENABLED: 'true',
          YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL: 'http://localhost:3002',
        }),
      ).publicBaseUrl,
    ).toBe('http://localhost:3002');
  });
});
