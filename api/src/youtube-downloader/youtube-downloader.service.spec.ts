import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { YoutubeDownloaderService } from './youtube-downloader.service';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import { allowRestrictedFixtureCleanup } from '../../test/youtube-fixtures';

const preview = {
  videoId: 'BaW_jenozKc',
  title: 'Fixture',
  thumbnailUrl: 'https://i.ytimg.com/vi/BaW_jenozKc/hqdefault.jpg',
  durationSeconds: 60,
  qualities: [720] as const,
};
const url = 'https://youtu.be/BaW_jenozKc';
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('temporary YouTube jobs', () => {
  let service: YoutubeDownloaderService;
  let downloadedPath = '';
  let runner: { preview: jest.Mock; download: jest.Mock; assertAvailable: jest.Mock };
  beforeEach(() => {
    allowRestrictedFixtureCleanup();
    runner = {
      assertAvailable: jest.fn().mockResolvedValue(undefined),
      preview: jest.fn().mockResolvedValue(preview),
      download: jest.fn(async (_url: string, _quality: number, directory: string) => {
        await mkdir(directory, { recursive: true });
        downloadedPath = join(directory, 'video.mp4');
        await writeFile(downloadedPath, 'fixture');
        return { path: downloadedPath, sizeBytes: 7 };
      }),
    };
    service = new YoutubeDownloaderService(
      new ConfigService({ YOUTUBE_DOWNLOADER_TEMP_DIR: join(__dirname, '../../.cache') }),
      runner as unknown as YoutubeDownloaderRunner,
    );
  });
  afterEach(async () => {
    await service.onModuleDestroy();
    jest.restoreAllMocks();
  });

  async function ready(userId = 'alice') {
    const job = await service.createJob(userId, url, 720);
    for (let n = 0; n < 50 && service.getJob(userId, job.id).status === 'preparing'; n++)
      await tick();
    expect(service.getJob(userId, job.id).status).toBe('ready');
    return job;
  }

  it('isolates reads, cancellation and tickets by owner', async () => {
    const job = await ready();
    expect(() => service.getJob('bob', job.id)).toThrow();
    expect(() => service.issueTicket('bob', job.id)).toThrow();
    await expect(service.cancelJob('bob', job.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('reserves per-user and global capacity before asynchronous work', async () => {
    runner.preview.mockImplementation(
      (_url: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
        ),
    );
    await service.createJob('alice', url, 720);
    await expect(service.createJob('alice', url, 720)).rejects.toMatchObject({ code: 'CAPACITY' });
    await service.createJob('bob', url, 720);
    await expect(service.createJob('carol', url, 720)).rejects.toMatchObject({ code: 'CAPACITY' });
  });
  it('bounds retained jobs to eight', async () => {
    for (let n = 0; n < 8; n++) await ready(`user-${n}`);
    await expect(service.createJob('other', url, 720)).rejects.toMatchObject({ code: 'CAPACITY' });
  });
  it('expires two-minute tickets without exposing account identity', async () => {
    const job = await ready();
    const now = Date.now();
    const ticket = service.issueTicket('alice', job.id);
    expect(ticket.token).toMatch(/^[a-f0-9]{64}$/);
    jest.spyOn(Date, 'now').mockReturnValue(now + 120001);
    expect(() => service.leaseDownload(ticket.token)).toThrow();
  });
  it('keeps an expired file through an active transfer and cleans it on release', async () => {
    const job = await ready();
    const now = Date.now();
    const ticket = service.issueTicket('alice', job.id);
    const lease = service.leaseDownload(ticket.token);
    jest.spyOn(Date, 'now').mockReturnValue(now + 600001);
    await service.sweep();
    await expect(access(lease.path)).resolves.toBeUndefined();
    expect(() => service.leaseDownload(ticket.token)).toThrow();
    await lease.release();
    await lease.release();
    await expect(access(lease.path)).rejects.toThrow();
  });
  it('cancels workers before cleanup and releases capacity for the next job', async () => {
    runner.download.mockImplementationOnce(
      (_url: string, _quality: number, _dir: string, signal: AbortSignal) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
        ),
    );
    const job = await service.createJob('alice', url, 720);
    for (let n = 0; n < 50 && !runner.download.mock.calls.length; n++) await tick();
    await service.cancelJob('alice', job.id);
    expect(service.getJob('alice', job.id).status).toBe('cancelled');
    await ready();
  });
  it('sanitizes failure output and cleans downloaded files on shutdown', async () => {
    runner.download.mockRejectedValueOnce(new Error('private provider URL'));
    const job = await service.createJob('alice', url, 720);
    for (let n = 0; n < 50 && service.getJob('alice', job.id).status === 'preparing'; n++)
      await tick();
    expect(service.getJob('alice', job.id)).toMatchObject({
      status: 'failed',
      errorCode: 'DOWNLOAD_FAILED',
    });
    await ready();
    const file = downloadedPath;
    await service.onModuleDestroy();
    await expect(access(file)).rejects.toThrow();
  });
  it('sweep does not remove a cancelling worker directory before the child exits', async () => {
    let finish!: () => void;
    let started!: () => void;
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    runner.download.mockImplementationOnce(
      async (_url: string, _quality: number, directory: string, signal: AbortSignal) => {
        downloadedPath = join(directory, 'video.mp4');
        await writeFile(downloadedPath, 'working');
        started();
        await new Promise<void>((resolve) => {
          finish = resolve;
        });
        if (signal.aborted) throw new Error('aborted');
        return { path: downloadedPath, sizeBytes: 7 };
      },
    );
    const job = await service.createJob('alice', url, 720);
    await began;
    const cancelling = service.cancelJob('alice', job.id);
    try {
      await service.sweep();
      await expect(access(downloadedPath)).resolves.toBeUndefined();
      await expect(service.createJob('alice', url, 720)).rejects.toMatchObject({
        code: 'CAPACITY',
      });
    } finally {
      finish();
      await cancelling;
    }
    await expect(access(downloadedPath)).rejects.toThrow();
  });
});
