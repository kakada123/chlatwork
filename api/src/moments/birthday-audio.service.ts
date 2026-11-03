import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { open, type FileHandle } from 'node:fs/promises';
import type { ReadStream } from 'node:fs';
import { join } from 'node:path';
import { BIRTHDAY_AUDIO_TRACKS, getBirthdayAudioTrack } from './birthday-audio';

interface AudioByteRange {
  start: number;
  end: number;
}
export interface BirthdayAudioResponse {
  statusCode: 200 | 206 | 416;
  headers: Record<string, string>;
  stream?: ReadStream;
}

/** Only one bounded byte range is supported, so seeking cannot fan out into many disk reads. */
export function parseBirthdayAudioRange(
  header: string,
  size: number,
): AudioByteRange | null {
  if (!Number.isSafeInteger(size) || size <= 0) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if (
    (first !== undefined && !Number.isSafeInteger(first)) ||
    (last !== undefined && !Number.isSafeInteger(last))
  )
    return null;
  if (first === undefined) {
    if (!last) return null;
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (last !== undefined && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

@Injectable()
export class BirthdayAudioService {
  listTracks() {
    return BIRTHDAY_AUDIO_TRACKS.map(({ id, title, durationMs }) => ({
      id,
      title,
      durationMs,
      src: `/api/moments/birthday-audio/${id}`,
    }));
  }

  async openTrack(
    trackId: string,
    rangeHeader?: string,
    head = false,
  ): Promise<BirthdayAudioResponse> {
    const track = getBirthdayAudioTrack(trackId);
    if (!track) throw new NotFoundException('Birthday audio track not found.');
    let file: FileHandle | undefined;
    try {
      // Open only the catalog filename; request parameters are never part of a filesystem path.
      file = await open(join(__dirname, 'assets', 'hbd', track.fileName), 'r');
      const stat = await file.stat();
      if (
        !stat.isFile() ||
        !Number.isSafeInteger(stat.size) ||
        stat.size <= 0
      ) {
        throw new Error('Invalid bundled asset');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'audio/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Length': String(stat.size),
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      };
      const range =
        rangeHeader === undefined || head
          ? undefined
          : parseBirthdayAudioRange(rangeHeader, stat.size);
      if (range === null) {
        await file.close();
        return {
          statusCode: 416,
          headers: {
            ...headers,
            'Cache-Control': 'no-store',
            'Content-Length': '0',
            'Content-Range': `bytes */${stat.size}`,
          },
        };
      }
      if (range) {
        headers['Content-Range'] =
          `bytes ${range.start}-${range.end}/${stat.size}`;
        headers['Content-Length'] = String(range.end - range.start + 1);
      }
      if (head) {
        await file.close();
        return { statusCode: 200, headers };
      }
      return {
        statusCode: range ? 206 : 200,
        headers,
        // The opened handle closes when the stream finishes, errors, or is destroyed after a canceled request.
        stream: file.createReadStream(
          range
            ? { start: range.start, end: range.end, autoClose: true }
            : { autoClose: true },
        ),
      };
    } catch {
      await file?.close().catch(() => undefined);
      throw new ServiceUnavailableException(
        'Birthday audio is temporarily unavailable.',
      );
    }
  }
}
