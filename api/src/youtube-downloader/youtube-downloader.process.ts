import { spawn } from 'node:child_process';
import { readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { YoutubeDownloaderError } from './youtube-downloader.errors';

export type YoutubeProcessOptions = {
  timeoutMs: number;
  signal?: AbortSignal;
  maxOutputBytes?: number;
  directory?: string;
  maxDirectoryBytes?: number;
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
      // Bound error output without retaining provider URLs or diagnostic details.
      errorBytes += chunk.length;
      if (errorBytes > 64 * 1024) stop(new YoutubeDownloaderError('DOWNLOAD_FAILED', 502));
    });
    child.once('error', () => finish(new YoutubeDownloaderError('UNAVAILABLE', 503)));
    child.once('close', (code) =>
      finish(
        failure ?? (code === 0 ? undefined : new YoutubeDownloaderError('DOWNLOAD_FAILED', 502)),
      ),
    );
  });
}
