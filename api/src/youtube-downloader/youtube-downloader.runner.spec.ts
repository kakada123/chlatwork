import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { runYoutubeProcess } from './youtube-downloader.process';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import { allowRestrictedFixtureCleanup } from '../../test/youtube-fixtures';
import * as processes from 'node:child_process';

const mediaMetadata = (width = 1280, height = 720) =>
  JSON.stringify({
    id: 'BaW_jenozKc',
    title: 'Fixture',
    duration: 60,
    availability: 'public',
    formats: [
      {
        format_id: '18',
        ext: 'mp4',
        vcodec: 'avc1.640028',
        acodec: 'mp4a.40.2',
        width,
        height,
      },
    ],
  });

describe('bounded YouTube subprocesses', () => {
  const directories: string[] = [];
  beforeEach(() => {
    allowRestrictedFixtureCleanup();
  });
  afterEach(async () => {
    await Promise.all(
      directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
    jest.restoreAllMocks();
  });

  it('runs arguments without a shell', async () => {
    expect(
      await runYoutubeProcess(
        process.execPath,
        ['-e', 'process.stdout.write(process.argv[1])', '$(echo unsafe)'],
        { timeoutMs: 2000 },
      ),
    ).toBe('$(echo unsafe)');
  });
  it('rejects missing executables with a safe error', async () => {
    await expect(
      runYoutubeProcess('/not-a-command', [], { timeoutMs: 1000 }),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
  it('sanitizes synchronous spawn failures', async () => {
    jest.spyOn(processes, 'spawn').mockImplementationOnce(() => {
      throw new Error('private process diagnostic');
    });
    await expect(runYoutubeProcess('yt-dlp', [], { timeoutMs: 1000 })).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });
  it('bounds subprocess output', async () => {
    await expect(
      runYoutubeProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(10000))'], {
        timeoutMs: 2000,
        maxOutputBytes: 100,
      }),
    ).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' });
  });
  it('terminates timed-out work', async () => {
    await expect(
      runYoutubeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        timeoutMs: 100,
      }),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });
  it('cancels work through an abort signal', async () => {
    const abort = new AbortController();
    const work = runYoutubeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      timeoutMs: 2000,
      signal: abort.signal,
    });
    abort.abort();
    await expect(work).rejects.toMatchObject({ code: 'CANCELLED' });
  });
  it('stops directory growth when metadata has no size', async () => {
    const directory = await mkdtemp(join(__dirname, '../../.cache/youtube-test-'));
    directories.push(directory);
    await writeFile(join(directory, 'part'), Buffer.alloc(20));
    await expect(
      runYoutubeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
        timeoutMs: 2000,
        directory,
        maxDirectoryBytes: 10,
      }),
    ).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });
  it.each(['ffmpeg', '/usr/bin/ffmpeg'])(
    'uses fixed YouTube arguments and verifies final video and audio with %s',
    async (ffmpegPath) => {
      const directory = await mkdtemp(join(__dirname, '../../.cache/youtube-test-'));
      directories.push(directory);
      await writeFile(join(directory, 'video.mp4'), 'test-file');
      const runner = new YoutubeDownloaderRunner(new ConfigService({ FFMPEG_PATH: ffmpegPath }));
      const exec = jest
        .spyOn(runner, 'execute')
        .mockResolvedValueOnce(mediaMetadata())
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(
          JSON.stringify({
            format: { duration: '60' },
            streams: [
              {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1280,
                height: 720,
              },
              { codec_type: 'audio', codec_name: 'aac' },
            ],
          }),
        );
      await expect(
        runner.download(
          'https://www.youtube.com/watch?v=BaW_jenozKc',
          720,
          directory,
          new AbortController().signal,
        ),
      ).resolves.toEqual({ path: join(directory, 'video.mp4'), sizeBytes: 9 });
      const args = exec.mock.calls[1][1];
      expect(args).toContain('--ignore-config');
      expect(args).toContain('--no-playlist');
      expect(args).not.toContain('--cookies');
      expect(args).toContain('--js-runtimes');
      expect(args).toContain('node');
      expect(args[args.indexOf('--format') + 1]).toBe('18');
      // yt-dlp's location option expects a filesystem path, not a PATH lookup name.
      if (ffmpegPath === 'ffmpeg') expect(args).not.toContain('--ffmpeg-location');
      else expect(args[args.indexOf('--ffmpeg-location') + 1]).toBe(ffmpegPath);
      exec
        .mockReset()
        .mockResolvedValueOnce(mediaMetadata())
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce(
          JSON.stringify({
            format: { duration: '60' },
            streams: [
              {
                codec_type: 'video',
                codec_name: 'h264',
                width: 1280,
                height: 720,
              },
            ],
          }),
        );
      await expect(
        runner.download(
          'https://www.youtube.com/watch?v=BaW_jenozKc',
          720,
          directory,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code: 'UNSUPPORTED_VIDEO' });
    },
  );
  it('accepts portrait video while limiting its short dimension', async () => {
    const directory = await mkdtemp(join(__dirname, '../../.cache/youtube-portrait-'));
    directories.push(directory);
    await writeFile(join(directory, 'video.mp4'), 'fixture');
    const runner = new YoutubeDownloaderRunner(new ConfigService({}));
    jest
      .spyOn(runner, 'execute')
      .mockResolvedValueOnce(mediaMetadata(720, 1280))
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(
        JSON.stringify({
          format: { duration: '60' },
          streams: [
            {
              codec_type: 'video',
              codec_name: 'h264',
              width: 720,
              height: 1280,
            },
            { codec_type: 'audio', codec_name: 'aac' },
          ],
        }),
      );
    await expect(
      runner.download('https://youtu.be/BaW_jenozKc', 720, directory, new AbortController().signal),
    ).resolves.toMatchObject({ sizeBytes: 7 });
  });
});
