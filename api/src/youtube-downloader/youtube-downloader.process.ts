import { spawn } from 'node:child_process';
import { readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { YoutubeDownloaderError, type YoutubeProcessDiagnostic } from './youtube-downloader.errors';

const logger = new Logger('YoutubeDownloaderProcess');

function failureReason(text: string): YoutubeProcessDiagnostic['reason'] {
  if (/HTTP(?: Error)?\s*403\b/i.test(text)) return 'UPSTREAM_FORBIDDEN';
  if (/HTTP(?: Error)?\s*429\b/i.test(text)) return 'UPSTREAM_RATE_LIMITED';
  if (/sign in to confirm|login required|authentication required/i.test(text))
    return 'UPSTREAM_AUTH_REQUIRED';
  if (/ffmpeg.*(?:not found|not installed)|ffmpeg-location.*does not exist/i.test(text))
    return 'FFMPEG_UNAVAILABLE';
  if (/(?:signature|challenge|n challenge).*solv(?:ing|er).*fail/i.test(text))
    return 'CHALLENGE_FAILED';
  if (/no space left on device/i.test(text)) return 'DISK_FULL';
  return 'UNKNOWN_PROCESS_FAILURE';
}

export type YoutubeProcessOptions = {
  timeoutMs: number;
  signal?: AbortSignal;
  maxOutputBytes?: number;
  directory?: string;
  maxDirectoryBytes?: number;
  stage?: YoutubeProcessDiagnostic['stage'];
};

async function directoryBytes(directory: string): Promise<number> {
  let bytes = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) bytes += await directoryBytes(path);
    else if (entry.isFile()) bytes += (await lstat(path).catch(() => null))?.size ?? 0;
    else throw new YoutubeDownloaderError('DOWNLOAD_FAILED', 502);
  }
  return bytes;
}

export async function runYoutubeProcess(
  command: string,
  args: string[],
  options: YoutubeProcessOptions,
): Promise<string> {
  if (options.signal?.aborted) throw new YoutubeDownloaderError('CANCELLED');
  return new Promise((resolve, reject) => {
    const grouped = process.platform !== 'win32';
    const start = () => {
      try {
        return spawn(command, args, {
          shell: false,
          detached: grouped,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch {
        throw new YoutubeDownloaderError('UNAVAILABLE', 503);
      }
    };
    const child = start();
    const chunks: Buffer[] = [];
    let outputBytes = 0;
    let errorBytes = 0;
    let errorTail = '';
    let reason: YoutubeProcessDiagnostic['reason'] = 'UNKNOWN_PROCESS_FAILURE';
    let failure: YoutubeDownloaderError | null = null;
    let monitoring = false;
    let settled = false;
    const stop = (error: YoutubeDownloaderError) => {
      failure ??= error;
      // yt-dlp launches ffmpeg/Node children; killing only the parent can leak work and disk.
      try {
        if (grouped && child.pid) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    };
    const abort = () => stop(new YoutubeDownloaderError('CANCELLED'));
    const timeout = setTimeout(
      () => stop(new YoutubeDownloaderError('TIMEOUT', 504)),
      options.timeoutMs,
    );
    const monitor = options.directory
      ? setInterval(() => {
          if (monitoring || settled || failure) return;
          monitoring = true;
          void directoryBytes(options.directory!)
            .then((bytes) => {
              if (!settled && bytes > (options.maxDirectoryBytes ?? 0))
                stop(new YoutubeDownloaderError('TOO_LARGE', 413));
            })
            .catch(() => {
              if (!settled) stop(new YoutubeDownloaderError('DOWNLOAD_FAILED', 502));
            })
            .finally(() => {
              monitoring = false;
            });
        }, 250)
      : null;
    const finish = (error?: YoutubeDownloaderError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (monitor) clearInterval(monitor);
      errorTail = '';
      options.signal?.removeEventListener('abort', abort);
      if (error) reject(error);
      else resolve(Buffer.concat(chunks).toString('utf8'));
    };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    child.stdout.on('data', (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > (options.maxOutputBytes ?? 2 * 1024 * 1024))
        stop(new YoutubeDownloaderError('DOWNLOAD_FAILED', 502));
      else chunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      // Classify a bounded rolling fragment; only fixed labels are retained or logged.
      const fragment = errorTail + chunk.toString('utf8');
      const classified = failureReason(fragment);
      if (classified !== 'UNKNOWN_PROCESS_FAILURE') reason = classified;
      errorTail = fragment.slice(-256);
      errorBytes += chunk.length;
      if (errorBytes > 64 * 1024) stop(new YoutubeDownloaderError('DOWNLOAD_FAILED', 502));
    });
    child.once('error', () => finish(new YoutubeDownloaderError('UNAVAILABLE', 503)));
    child.once('close', (code) => {
      if (settled) return;
      const error =
        failure ?? (code === 0 ? undefined : new YoutubeDownloaderError('DOWNLOAD_FAILED', 502));
      if (!error) return finish();
      const diagnostic = { stage: options.stage ?? 'unknown', reason, exitCode: code };
      // Never log raw stderr, argv, source links, account IDs, or filesystem paths.
      if (error.code !== 'CANCELLED') logger.warn({ event: 'youtube_process_failed', ...diagnostic });
      finish(new YoutubeDownloaderError(error.code, error.getStatus(), diagnostic));
    });
  });
}
