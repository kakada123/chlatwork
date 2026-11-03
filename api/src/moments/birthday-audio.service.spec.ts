import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  HEADERS_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';
import { createHash } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import type { Response } from 'express';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { AssetsManager } from '@nestjs/cli/lib/compiler/assets-manager';
import { BIRTHDAY_AUDIO_TRACKS, readBirthdayAudioClip } from './birthday-audio';
import {
  BirthdayAudioService,
  parseBirthdayAudioRange,
} from './birthday-audio.service';
import { MomentsController } from './moments.controller';

async function bytes(stream: Readable | undefined) {
  const chunks: Buffer[] = [];
  if (stream) for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

const firstTrack = BIRTHDAY_AUDIO_TRACKS[0];
const service = new BirthdayAudioService();
const sourcePath = () => join(__dirname, 'assets', 'hbd', firstTrack.fileName);

describe('BirthdayAudioService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('exposes a stable public catalog without bundled filenames or filesystem paths', () => {
    const catalog = service.listTracks();
    expect(catalog).toHaveLength(10);
    expect(catalog[0]).toEqual({
      id: 'hbd-001',
      title: firstTrack.title,
      durationMs: firstTrack.durationMs,
      src: '/api/moments/birthday-audio/hbd-001',
    });
    for (const track of catalog) {
      expect(Object.keys(track).sort()).toEqual([
        'durationMs',
        'id',
        'src',
        'title',
      ]);
      expect(track.src).toBe(`/api/moments/birthday-audio/${track.id}`);
    }
    expect(JSON.stringify(catalog)).not.toMatch(/\.m4a|fileName|assets\/hbd/);
  });

  it('streams the original complete asset with accurate type and length', async () => {
    const expected = readFileSync(sourcePath());
    const asset = await service.openTrack(firstTrack.id);
    expect(asset.statusCode).toBe(200);
    expect(asset.headers).toEqual({
      'Content-Type': 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Length': String(expected.length),
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    expect((await bytes(asset.stream)).equals(expected)).toBe(true);
  });

  it.each([
    ['bytes=2-8', 2, 8],
    ['bytes=2-', 2, undefined],
    ['bytes=-17', -17, undefined],
    ['bytes=0-99999999', 0, undefined],
    ['bytes=-99999999', 0, undefined],
  ])(
    'streams exactly the requested byte range %s',
    async (range, start, end) => {
      const expected = readFileSync(sourcePath());
      const actualStart = start < 0 ? expected.length + start : start;
      const actualEnd = end ?? expected.length - 1;
      const asset = await service.openTrack(firstTrack.id, range);
      expect(asset.statusCode).toBe(206);
      expect(asset.headers['Content-Range']).toBe(
        `bytes ${actualStart}-${actualEnd}/${expected.length}`,
      );
      expect(asset.headers['Content-Length']).toBe(
        String(actualEnd - actualStart + 1),
      );
      expect(
        (await bytes(asset.stream)).equals(
          expected.subarray(actualStart, actualEnd + 1),
        ),
      ).toBe(true);
    },
  );

  it.each([
    'bytes=99999999-',
    'bytes=9-2',
    'bytes=-0',
    'bytes=-',
    'bytes=1-2,4-5',
    'bytes=abc-def',
    'items=0-3',
    'bytes=9007199254740992-',
    '',
  ])('returns safe 416 metadata without a stream for %s', async (range) => {
    const asset = await service.openTrack(firstTrack.id, range);
    expect(asset.statusCode).toBe(416);
    expect(asset.headers['Content-Range']).toBe(
      `bytes */${readFileSync(sourcePath()).length}`,
    );
    expect(asset.headers['Content-Length']).toBe('0');
    expect(asset.stream).toBeUndefined();
  });

  it('provides HEAD metadata without returning or leaving an open stream', async () => {
    const asset = await service.openTrack(firstTrack.id, undefined, true);
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['Content-Length']).toBe(
      String(readFileSync(sourcePath()).length),
    );
    expect(asset.stream).toBeUndefined();
  });

  it.each([
    'missing',
    '../hbd-001',
    '../../package.json',
    '%2e%2e%2fpackage.json',
    'hbd-001.m4a',
  ])(
    'rejects unknown or traversal IDs without touching the filesystem: %s',
    async (id) => {
      const open = jest.spyOn(fs, 'open');
      await expect(service.openTrack(id)).rejects.toThrow(NotFoundException);
      expect(open).not.toHaveBeenCalled();
    },
  );

  it('reports missing bundled assets with a generic 503 and no raw file paths', async () => {
    jest
      .spyOn(fs, 'open')
      .mockRejectedValueOnce(
        new Error('/private/build/assets/hbd/missing.m4a'),
      );
    await expect(service.openTrack(firstTrack.id)).rejects.toEqual(
      new ServiceUnavailableException(
        'Birthday audio is temporarily unavailable.',
      ),
    );
  });

  it('preserves the canonical stored-clip validation contract', () => {
    expect(
      readBirthdayAudioClip({
        trackId: firstTrack.id,
        startMs: 0,
        endMs: 1000,
      }),
    ).toEqual({ trackId: firstTrack.id, startMs: 0, endMs: 1000 });
    expect(
      readBirthdayAudioClip({ trackId: '../file', startMs: 0, endMs: 1000 }),
    ).toBeNull();
    expect(
      readBirthdayAudioClip({
        trackId: firstTrack.id,
        startMs: 0,
        endMs: firstTrack.durationMs + 1,
      }),
    ).toBeNull();
  });
});

describe('birthday audio range boundaries', () => {
  it.each([
    ['bytes=0-0', 10, { start: 0, end: 0 }],
    ['bytes=1-', 10, { start: 1, end: 9 }],
    ['bytes=-3', 10, { start: 7, end: 9 }],
    ['bytes=8-99', 10, { start: 8, end: 9 }],
    ['bytes=-99', 10, { start: 0, end: 9 }],
    ['bytes=10-', 10, null],
    ['bytes=0-0', 0, null],
    ['bytes=1.5-3', 10, null],
  ])('parses %s against a %i-byte asset', (range, size, expected) => {
    expect(parseBirthdayAudioRange(range, size)).toEqual(expected);
  });
});

describe('birthday audio deployment and routes', () => {
  it('caches the public catalog for five minutes', () => {
    expect(
      Reflect.getMetadata(
        HEADERS_METADATA,
        MomentsController.prototype.listBirthdayAudio,
      ),
    ).toContainEqual({ name: 'Cache-Control', value: 'public, max-age=300' });
  });
  it('copies every original audio byte into the Nest output asset directory', () => {
    const config = JSON.parse(
      readFileSync(resolve(__dirname, '../../nest-cli.json'), 'utf8'),
    );
    const tempRoot = resolve(__dirname, '../../../.tmp/birthday-audio');
    mkdirSync(tempRoot, { recursive: true });
    const output = mkdtempSync(join(tempRoot, 'nest-assets-'));
    const manager = new AssetsManager();
    manager.copyAssets(
      {
        ...config,
        sourceRoot: relative(process.cwd(), resolve(__dirname, '..')),
      },
      undefined,
      output,
      false,
    );
    for (const track of BIRTHDAY_AUDIO_TRACKS) {
      const source = readFileSync(
        join(__dirname, 'assets', 'hbd', track.fileName),
      );
      const bundled = readFileSync(
        join(output, 'moments', 'assets', 'hbd', track.fileName),
      );
      const sha = (value: Buffer) =>
        createHash('sha256').update(value).digest('hex');
      expect(sha(bundled)).toBe(sha(source));
    }
  });

  it.each([
    ['listBirthdayAudio', 'birthday-audio'],
    ['getBirthdayAudio', 'birthday-audio/:trackId'],
    ['headBirthdayAudio', 'birthday-audio/:trackId'],
  ])('keeps %s public and outside the shared IP throttle', (method, path) => {
    const handler =
      MomentsController.prototype[method as keyof MomentsController];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toBeUndefined();
    expect(Reflect.getMetadata(`${THROTTLER_SKIP}default`, handler)).toBe(true);
  });
});

class AudioResponse extends EventEmitter {
  statusCode = 200;
  headers: Record<string, string> = {};
  body = '';
  destroyed = false;
  headersSent = false;
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }
  removeHeader(name: string) {
    delete this.headers[name];
  }
  send(body: string) {
    this.body = body;
  }
  end() {
    this.emit('close');
  }
}

describe('birthday audio response handling', () => {
  const controller = new MomentsController(
    null as never,
    null as never,
    service,
    null as never,
  );

  it('returns range bytes with response headers and destroys a canceled stream', async () => {
    const response = new AudioResponse();
    const file = await controller.getBirthdayAudio(
      firstTrack.id,
      'bytes=4-12',
      response as unknown as Response,
    );
    expect(response.statusCode).toBe(206);
    expect(response.headers['Content-Length']).toBe('9');
    expect(
      (await bytes(file!.getStream())).equals(
        readFileSync(sourcePath()).subarray(4, 13),
      ),
    ).toBe(true);

    const canceled = new AudioResponse();
    const secondFile = await controller.getBirthdayAudio(
      firstTrack.id,
      undefined,
      canceled as unknown as Response,
    );
    const closed = once(secondFile!.getStream(), 'close');
    canceled.emit('close');
    await closed;
    expect(secondFile!.getStream().destroyed).toBe(true);
  });

  it('returns 416 headers and HEAD metadata without a response body', async () => {
    const invalid = new AudioResponse();
    expect(
      await controller.getBirthdayAudio(
        firstTrack.id,
        'bytes=-0',
        invalid as unknown as Response,
      ),
    ).toBeUndefined();
    expect(invalid.statusCode).toBe(416);
    expect(invalid.headers['Content-Range']).toBe(
      `bytes */${readFileSync(sourcePath()).length}`,
    );
    expect(invalid.headers['Content-Length']).toBe('0');

    const head = new AudioResponse();
    expect(
      await controller.headBirthdayAudio(
        firstTrack.id,
        head as unknown as Response,
      ),
    ).toBeUndefined();
    expect(head.statusCode).toBe(200);
    expect(head.headers['Content-Length']).toBe(
      String(readFileSync(sourcePath()).length),
    );
    expect(head.body).toBe('');
  });

  it('replaces late disk errors with a safe non-cacheable 503 without exposing paths', async () => {
    const response = new AudioResponse();
    const file = await controller.getBirthdayAudio(
      firstTrack.id,
      'bytes=0-5',
      response as unknown as Response,
    );
    file!.errorHandler(new Error('/private/build/track.m4a'), response);
    expect(response.statusCode).toBe(503);
    expect(response.body).toBe('Birthday audio is temporarily unavailable.');
    expect(response.headers['Cache-Control']).toBe('no-store');
    expect(response.headers['Content-Length']).toBeUndefined();
    expect(response.headers['Content-Range']).toBeUndefined();
    const closed = once(file!.getStream(), 'close');
    response.emit('close');
    await closed;
  });
});
