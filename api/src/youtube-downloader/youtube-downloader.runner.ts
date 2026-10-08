import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { readYoutubeDownloaderConfig } from './youtube-downloader.config';
import { YoutubeDownloaderError } from './youtube-downloader.errors';
import {
  normalizeYoutubeUrl,
  readYoutubePreview,
  selectYoutubeFormat,
} from './youtube-downloader.policy';
import { runYoutubeProcess, type YoutubeProcessOptions } from './youtube-downloader.process';
import { YOUTUBE_LIMITS, type YoutubeQuality } from './youtube-downloader.types';

@Injectable()
export class YoutubeDownloaderRunner {
  private healthyUntil = 0;
  private checkingHealth: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  execute(command: string, args: string[], options: YoutubeProcessOptions) {
    return runYoutubeProcess(command, args, options);
  }

  async assertAvailable() {
    if (Date.now() < this.healthyUntil) return;
    if (this.checkingHealth) return this.checkingHealth;
    const settings = readYoutubeDownloaderConfig(this.config);
    this.checkingHealth = (async () => {
      try {
        // Check binaries once per minute, rather than spawning checks on every poll.
        await this.execute(
          settings.ytdlpPath,
          ['--ignore-config', '--no-plugin-dirs', '--version'],
          { timeoutMs: 5000 },
        );
        await this.execute(settings.ffmpegPath, ['-version'], { timeoutMs: 5000 });
        await this.execute(settings.ffprobePath, ['-version'], { timeoutMs: 5000 });
        this.healthyUntil = Date.now() + 60_000;
      } catch {
        throw new YoutubeDownloaderError('UNAVAILABLE', 503);
      }
    })();
    try {
      await this.checkingHealth;
    } finally {
      this.checkingHealth = null;
    }
  }

  private arguments() {
    return [
      '--ignore-config',
      '--no-plugin-dirs',
      '--no-playlist',
      '--no-cache-dir',
      '--no-progress',
      '--no-warnings',
      '--js-runtimes',
      'node',
      '--socket-timeout',
      '15',
      '--retries',
      '1',
      '--fragment-retries',
      '1',
      '--extractor-retries',
      '1',
    ];
  }

  private async metadata(input: string, signal: AbortSignal) {
    const { url, videoId } = normalizeYoutubeUrl(input);
    const settings = readYoutubeDownloaderConfig(this.config);
    const output = await this.execute(
      settings.ytdlpPath,
      [...this.arguments(), '--skip-download', '--dump-single-json', '--', url],
      { timeoutMs: YOUTUBE_LIMITS.previewTimeoutMs, signal },
    );
    try {
      return { raw: JSON.parse(output) as unknown, videoId, url };
    } catch (error) {
      if (error instanceof YoutubeDownloaderError) throw error;
      throw new YoutubeDownloaderError('DOWNLOAD_FAILED', 502);
    }
  }

  async preview(input: string, signal: AbortSignal) {
    const { raw, videoId } = await this.metadata(input, signal);
    return readYoutubePreview(raw, videoId);
  }

  async download(input: string, quality: YoutubeQuality, directory: string, signal: AbortSignal) {
    const { raw, videoId, url } = await this.metadata(input, signal);
    // Use the same eligibility policy as preview, including the aggregate file-size bound.
    const selectedFormat = selectYoutubeFormat(raw, videoId, quality);
    const settings = readYoutubeDownloaderConfig(this.config);
    const path = join(directory, 'video.mp4');
    await this.execute(
      settings.ytdlpPath,
      [
        ...this.arguments(),
        '--no-part',
        '--no-continue',
        '--restrict-filenames',
        '--max-filesize',
        String(YOUTUBE_LIMITS.fileBytes),
        '--concurrent-fragments',
        '1',
        '--match-filter',
        'duration <= 1200 & !is_live',
        '--ffmpeg-location',
        settings.ffmpegPath,
        '--format',
        selectedFormat,
        '--merge-output-format',
        'mp4',
        '--output',
        path,
        '--',
        url,
      ],
      {
        timeoutMs: YOUTUBE_LIMITS.preparationTimeoutMs,
        signal,
        directory,
        maxDirectoryBytes: YOUTUBE_LIMITS.workingBytes,
      },
    );
    const file = await lstat(path).catch(() => null);
    if (!file?.isFile() || file.size <= 0) throw new YoutubeDownloaderError('DOWNLOAD_FAILED', 502);
    if (file.size > YOUTUBE_LIMITS.fileBytes) throw new YoutubeDownloaderError('TOO_LARGE', 413);
    const output = await this.execute(
      settings.ffprobePath,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file,pipe',
        '-show_entries',
        'format=duration:stream=codec_type,codec_name,height,width',
        '-of',
        'json',
        path,
      ],
      { timeoutMs: 15_000, signal },
    );
    try {
      const info = JSON.parse(output) as {
        format?: { duration?: string };
        streams?: { codec_type?: string; codec_name?: string; height?: number; width?: number }[];
      };
      const duration = Number(info.format?.duration);
      const streams = Array.isArray(info.streams) ? info.streams : [];
      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > YOUTUBE_LIMITS.durationSeconds + 1 ||
        !streams.some(
          (s) =>
            s.codec_type === 'video' &&
            s.codec_name === 'h264' &&
            Number(s.height) > 0 &&
            Number(s.width) > 0 &&
            Math.min(Number(s.width), Number(s.height)) <= quality &&
            Math.max(Number(s.width), Number(s.height)) <= quality * 2,
        ) ||
        !streams.some((s) => s.codec_type === 'audio' && s.codec_name === 'aac')
      )
        throw new Error();
    } catch {
      throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
    }
    return { path, sizeBytes: file.size };
  }
}
