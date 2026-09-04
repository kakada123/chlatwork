import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, open, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TranscriptSegment } from './creator-ai.types';

@Injectable()
export class CreatorVideoToolsService {
  constructor(private readonly config: ConfigService) {}

  async validateMagic(path: string, declaredMime: string) {
    const handle = await open(path, 'r');
    try {
      const bytes = Buffer.alloc(16);
      await handle.read(bytes, 0, bytes.length, 0);
      const isIsoMedia = bytes.subarray(4, 8).toString('ascii') === 'ftyp';
      const isWebm = bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      return declaredMime === 'video/webm' ? isWebm : isIsoMedia;
    } finally {
      await handle.close();
    }
  }

  async duration(path: string) {
    const output = await this.run(
      this.config.get<string>('FFPROBE_PATH')?.trim() || 'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        path,
      ],
      30_000,
    );
    const duration = Number(output.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Video duration could not be determined');
    }
    return Math.ceil(duration);
  }

  async extractAudio(videoPath: string) {
    const outputPath = join(dirname(videoPath), `${randomUUID()}.mp3`);
    try {
      await this.run(
        this.config.get<string>('FFMPEG_PATH')?.trim() || 'ffmpeg',
        [
          '-nostdin',
          '-v',
          'error',
          '-i',
          videoPath,
          '-vn',
          '-ac',
          '1',
          '-ar',
          '16000',
          '-c:a',
          'mp3',
          '-y',
          outputPath,
        ],
        5 * 60_000,
      );
      return outputPath;
    } catch (error) {
      await this.remove(outputPath);
      throw error;
    }
  }

  async hashFile(path: string) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(path)) {
      hash.update(chunk as Buffer);
    }
    return hash.digest('hex');
  }

  async exists(path: string) {
    return access(path).then(
      () => true,
      () => false,
    );
  }

  safeOriginalName(value: string) {
    return (
      basename(value)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/[^\p{L}\p{N}._ -]/gu, '_')
        .slice(0, 180) || 'creator-video'
    );
  }

  srt(segments: TranscriptSegment[]) {
    return segments
      .map(
        (segment, index) =>
          `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${segment.text.trim()}`,
      )
      .join('\n\n');
  }

  async remove(path: string | null | undefined) {
    if (!path) return;
    await unlink(path).catch(() => undefined);
  }

  private run(command: string, args: string[], timeoutMs: number) {
    return new Promise<string>((resolve, reject) => {
      const child = spawn(command, args, {
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`${command} timed out`));
      }, timeoutMs);
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        if (stdout.length < 10_000) stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        if (stderr.length < 10_000) stderr += chunk;
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) resolve(stdout);
        else reject(new Error(`${command} exited with code ${code}: ${stderr.slice(0, 200)}`));
      });
    });
  }
}

function formatSrtTime(seconds: number) {
  const milliseconds = Math.max(0, Math.round(seconds * 1_000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const secs = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${String(millis).padStart(3, '0')}`;
}

const pad = (value: number) => String(value).padStart(2, '0');
