import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, open, unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import type { CreatorSubtitleStyle, TranscriptSegment } from './creator-ai.types';

@Injectable()
export class CreatorVideoToolsService {
  constructor(private readonly config: ConfigService) {}

  async validateMagic(path: string, declaredMime: string) {
    const handle = await open(path, 'r');
    try {
      const bytes = Buffer.alloc(16);
      await handle.read(bytes, 0, bytes.length, 0);
      return matchesCreatorMediaMagic(bytes, declaredMime);
    } finally {
      await handle.close();
    }
  }

  async duration(path: string, declaredMime: string) {
    const output = await this.run(
      this.config.get<string>('FFPROBE_PATH')?.trim() ||
        CREATOR_AI_DEFAULTS.ffprobePath,
      [
        '-v',
        'error',
        '-protocol_whitelist',
        'file,pipe',
        '-show_entries',
        'format=duration:stream=codec_type,start_time,duration',
        '-of',
        'json',
        path,
      ],
      30_000,
    );
    return verifiedCreatorMediaDuration(JSON.parse(output), declaredMime);
  }

  async extractAudio(
    videoPath: string,
    durationSeconds: number,
    preserveAudioTimeline = false,
  ) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error('A verified media duration is required');
    }
    const outputPath = join(dirname(videoPath), `${randomUUID()}.mp3`);
    try {
      await this.run(
        this.config.get<string>('FFMPEG_PATH')?.trim() ||
          CREATOR_AI_DEFAULTS.ffmpegPath,
        [
          '-nostdin',
          '-v',
          'error',
          '-protocol_whitelist',
          'file,pipe',
          // Audio extracted on-device retains the video's timestamps. Preserve
          // an initial delay as silence so generated SRT stays in sync.
          ...(preserveAudioTimeline ? ['-copyts'] : []),
          '-i',
          videoPath,
          // Bound timestamp padding and decoding to the validated job duration.
          '-t',
          String(durationSeconds),
          '-map',
          '0:a:0',
          '-vn',
          ...(preserveAudioTimeline
            ? ['-af', 'aresample=async=1:first_pts=0']
            : []),
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

  srt(
    segments: TranscriptSegment[],
    style: CreatorSubtitleStyle = 'ORIGINAL_SEGMENTS',
  ) {
    return segments
      .flatMap((segment) =>
        style === 'SHORT_PHRASES' ? subtitleCues(segment) : [segment],
      )
      .map(
        (cue, index) =>
          `${index + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text.trim()}`,
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

interface SubtitlePhrase {
  text: string;
  spaceBefore: boolean;
}

const khmerScript = /\p{Script=Khmer}/u;
const khmerWordSegmenter = new Intl.Segmenter('km', { granularity: 'word' });
const graphemeSegmenter = new Intl.Segmenter('km', { granularity: 'grapheme' });

function graphemeLength(text: string) {
  return [...graphemeSegmenter.segment(text)].length;
}

function subtitlePhrases(text: string): SubtitlePhrase[] {
  const phrases: SubtitlePhrase[] = [];
  let latinPhrase = '';
  const flushLatin = () => {
    if (!latinPhrase) return;
    phrases.push({ text: latinPhrase, spaceBefore: phrases.length > 0 });
    latinPhrase = '';
  };

  for (const token of text.split(' ')) {
    if (!khmerScript.test(token)) {
      const joined = latinPhrase ? `${latinPhrase} ${token}` : token;
      if (latinPhrase && graphemeLength(joined) > 32) flushLatin();
      latinPhrase = latinPhrase ? `${latinPhrase} ${token}` : token;
      continue;
    }
    flushLatin();
    let phrase = '';
    let spaceBefore = phrases.length > 0;
    const parts = [...khmerWordSegmenter.segment(token)];
    for (const [index, part] of parts.entries()) {
      const word = part.segment;
      const isShortFinalWord =
        graphemeLength(word) <= 2 &&
        !parts.slice(index + 1).some((remaining) => remaining.isWordLike);
      // Khmer spaces mark phrases; within one phrase, break only at word
      // boundaries so a subtitle never splits a combining character.
      if (
        phrase &&
        part.isWordLike &&
        graphemeLength(phrase + word) > 8 &&
        !isShortFinalWord
      ) {
        phrases.push({ text: phrase, spaceBefore });
        phrase = word;
        spaceBefore = false;
      } else {
        phrase += word;
      }
    }
    if (phrase) phrases.push({ text: phrase, spaceBefore });
  }
  flushLatin();
  return phrases;
}

function subtitleCues(segment: TranscriptSegment): TranscriptSegment[] {
  const text = segment.text.trim().replace(/\s+/gu, ' ');
  if (!text) return [];
  const duration = segment.end - segment.start;
  const phrases = subtitlePhrases(text);
  const maxCues = Number.isFinite(duration)
    ? Math.max(1, Math.floor(duration / 0.6))
    : 1;

  // Very short source segments cannot display every short phrase long enough
  // to read. Merge the shortest neighbors while retaining their original spaces.
  while (phrases.length > maxCues) {
    let shortestPair = 0;
    let shortestLength = Number.POSITIVE_INFINITY;
    for (let index = 0; index < phrases.length - 1; index++) {
      const length = graphemeLength(phrases[index].text) +
        graphemeLength(phrases[index + 1].text);
      if (length < shortestLength) {
        shortestLength = length;
        shortestPair = index;
      }
    }
    const following = phrases[shortestPair + 1];
    phrases[shortestPair].text +=
      `${following.spaceBefore ? ' ' : ''}${following.text}`;
    phrases.splice(shortestPair + 1, 1);
  }

  const weights = phrases.map((phrase) => Math.max(1, graphemeLength(phrase.text)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const minimumCueSeconds = phrases.length > 1 ? 0.35 : 0;
  const flexibleSeconds = Math.max(0, duration - phrases.length * minimumCueSeconds);
  let elapsedWeight = 0;
  let cueStart = segment.start;
  return phrases.map((phrase, index) => {
    elapsedWeight += weights[index];
    const cueEnd = index === phrases.length - 1
      ? segment.end
      : segment.start +
        (index + 1) * minimumCueSeconds +
        (flexibleSeconds * elapsedWeight) / totalWeight;
    const cue = { start: cueStart, end: cueEnd, text: phrase.text };
    cueStart = cueEnd;
    return cue;
  });
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

export function matchesCreatorMediaMagic(bytes: Buffer, mime: string) {
  const header = bytes.toString('ascii');
  switch (mime) {
    case 'video/mp4':
    case 'video/quicktime':
    case 'audio/mp4':
    case 'audio/x-m4a':
      return header.slice(4, 8) === 'ftyp';
    case 'video/webm':
    case 'audio/webm':
      return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'audio/mpeg':
      return (
        header.startsWith('ID3') ||
        (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
      );
    case 'audio/wav':
    case 'audio/x-wav':
      return header.startsWith('RIFF') && header.slice(8, 12) === 'WAVE';
    case 'audio/ogg':
      return header.startsWith('OggS');
    case 'audio/flac':
      return header.startsWith('fLaC');
    default:
      return false;
  }
}

export function verifiedCreatorMediaDuration(
  probe: {
    format?: { duration?: string };
    streams?: { codec_type?: string; start_time?: string; duration?: string }[];
  },
  declaredMime: string,
) {
  const streams = Array.isArray(probe?.streams) ? probe.streams : [];
  const audio = streams.filter((stream) => stream.codec_type === 'audio');
  // Container signatures alone cannot distinguish audio-only MP4/WebM from video.
  if (
    !audio.length ||
    (declaredMime.startsWith('audio/') &&
      streams.some((stream) => stream.codec_type === 'video'))
  ) {
    throw new Error('A supported audio track is required');
  }
  const durations = [
    Number(probe.format?.duration),
    ...audio.map(
      (stream) =>
        Math.max(0, Number(stream.start_time) || 0) + Number(stream.duration),
    ),
  ].filter((duration) => Number.isFinite(duration) && duration > 0);
  if (!durations.length)
    throw new Error('Media duration could not be determined');
  return Math.ceil(Math.max(...durations));
}
