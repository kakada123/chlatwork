import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { YoutubeDownloaderController } from './youtube-downloader.controller';
import { YoutubeDownloaderService } from './youtube-downloader.service';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import { FeatureAvailabilityService } from '../feature-availability/feature-availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Response } from 'express';
import { injectHttp } from '../../test/http-inject';

describe('YouTube API boundaries', () => {
  const settings = new ConfigService({
    NODE_ENV: 'development',
    YOUTUBE_DOWNLOADER_ENABLED: 'true',
    YOUTUBE_DOWNLOADER_PUBLIC_BASE_URL: 'http://localhost:3002',
  });
  const service = {
    preview: jest.fn().mockResolvedValue({ title: 'Fixture' }),
    createJob: jest
      .fn()
      .mockResolvedValue({ id: '4a823e91-6518-4eca-bdb4-9636543d6243', status: 'preparing' }),
    getJob: jest.fn(),
    cancelJob: jest.fn(),
    issueTicket: jest.fn().mockReturnValue({ token: 'a'.repeat(64), expiresAt: 'later' }),
    leaseDownload: jest.fn(),
  };
  const availability = { isEnabled: jest.fn().mockResolvedValue(true) };
  const runner = { assertAvailable: jest.fn().mockResolvedValue(undefined) };
  let app: Awaited<ReturnType<typeof createApp>>;

  async function createApp() {
    const module = await Test.createTestingModule({
      controllers: [YoutubeDownloaderController],
      providers: [
        { provide: ConfigService, useValue: settings },
        { provide: YoutubeDownloaderService, useValue: service },
        { provide: FeatureAvailabilityService, useValue: availability },
        { provide: YoutubeDownloaderRunner, useValue: runner },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp(): {
            getRequest(): { headers: Record<string, string>; user?: { id: string } };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          if (request.headers.authorization !== 'Bearer fixture') return false;
          request.user = { id: 'alice' };
          return true;
        },
      })
      .compile();
    const instance = module.createNestApplication();
    instance.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await instance.init();
    return instance;
  }
  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    availability.isEnabled.mockResolvedValue(true);
    runner.assertAvailable.mockResolvedValue(undefined);
  });
  const request = (path: string, body: unknown, authenticated = true) =>
    injectHttp(app, `/youtube-downloader/${path}`, {
      method: 'POST',
      headers: authenticated ? { authorization: 'Bearer fixture' } : {},
      body,
    });

  it('guards processing endpoints and scopes requests to the authenticated owner', async () => {
    expect((await request('preview', { url: 'https://youtu.be/BaW_jenozKc' }, false)).status).toBe(
      403,
    );
    expect(service.preview).not.toHaveBeenCalled();
    expect((await request('preview', { url: 'https://youtu.be/BaW_jenozKc' })).status).toBe(200);
    expect(service.preview).toHaveBeenCalledWith('alice', 'https://youtu.be/BaW_jenozKc');
  });
  it('rejects unknown properties, invalid quality and IDs', async () => {
    expect(
      (await request('jobs', { url: 'https://youtu.be/BaW_jenozKc', quality: 2160 })).status,
    ).toBe(400);
    expect(
      (
        await request('jobs', {
          url: 'https://youtu.be/BaW_jenozKc',
          quality: 720,
          command: 'echo',
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await injectHttp(app, '/youtube-downloader/jobs/invalid', {
          headers: { authorization: 'Bearer fixture' },
        })
      ).status,
    ).toBe(400);
    expect(service.createJob).not.toHaveBeenCalled();
  });
  it('checks availability and dependency health before side effects', async () => {
    availability.isEnabled.mockResolvedValueOnce(false);
    expect((await request('preview', { url: 'https://youtu.be/BaW_jenozKc' })).status).toBe(503);
    runner.assertAvailable.mockRejectedValueOnce(new Error('private diagnostic'));
    const response = await request('preview', { url: 'https://youtu.be/BaW_jenozKc' });
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private diagnostic');
    expect(service.preview).not.toHaveBeenCalled();
  });
  it('issues a no-store download ticket without an account token', async () => {
    const response = await request('jobs/4a823e91-6518-4eca-bdb4-9636543d6243/ticket', {});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      downloadUrl: `http://localhost:3002/youtube-downloader/files/${'a'.repeat(64)}`,
      expiresAt: 'later',
    });
  });
  it('streams a ticket attachment and releases the lease on finish', async () => {
    const directory = await mkdtemp(join(__dirname, '../../.cache/youtube-stream-'));
    const path = join(directory, 'video.mp4');
    await writeFile(path, 'video');
    const release = jest.fn().mockResolvedValue(undefined);
    service.leaseDownload.mockReturnValue({ path, fileName: 'video.mp4', sizeBytes: 5, release });
    const response = await injectHttp(app, `/youtube-downloader/files/${'a'.repeat(64)}`);
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(await response.text()).toBe('video');
    expect(release).toHaveBeenCalledTimes(1);
    await unlink(path);
  });
  it('releases the lease when a client disconnects', async () => {
    const directory = await mkdtemp(join(__dirname, '../../.cache/youtube-disconnect-'));
    const path = join(directory, 'video.mp4');
    await writeFile(path, 'video');
    const release = jest.fn().mockResolvedValue(undefined);
    service.leaseDownload.mockReturnValue({ path, fileName: 'video.mp4', sizeBytes: 5, release });
    const controller = new YoutubeDownloaderController(
      settings,
      service as unknown as YoutubeDownloaderService,
      availability as unknown as FeatureAvailabilityService,
      runner as unknown as YoutubeDownloaderRunner,
    );
    const response = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    }) as Writable & {
      setHeader: jest.Mock;
      headersSent: boolean;
      status: jest.Mock;
      json: jest.Mock;
    };
    response.setHeader = jest.fn();
    response.headersSent = true;
    response.status = jest.fn().mockReturnThis();
    response.json = jest.fn();
    await controller.download('a'.repeat(64), response as unknown as Response);
    response.emit('close');
    await new Promise((resolve) => setImmediate(resolve));
    expect(release).toHaveBeenCalledTimes(1);
    await unlink(path);
  });
  it('returns an intact JSON error if the ready file cannot be opened', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    service.leaseDownload.mockReturnValue({
      path: join(__dirname, '../../.cache/missing-video.mp4'),
      fileName: 'video.mp4',
      sizeBytes: 200,
      release,
    });
    const response = await injectHttp(app, `/youtube-downloader/files/${'a'.repeat(64)}`);
    expect(response.status).toBe(502);
    expect(response.headers.get('content-disposition')).toBeNull();
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('content-length')).not.toBe('200');
    expect(await response.json()).toMatchObject({ code: 'DOWNLOAD_FAILED' });
    expect(release).toHaveBeenCalledTimes(1);
  });
});
