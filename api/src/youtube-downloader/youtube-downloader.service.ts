import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YoutubeDownloaderError } from './youtube-downloader.errors';
import { normalizeYoutubeUrl } from './youtube-downloader.policy';
import { YoutubeDownloaderRunner } from './youtube-downloader.runner';
import {
  YOUTUBE_LIMITS,
  YOUTUBE_QUALITIES,
  type YoutubeJobView,
  type YoutubePreview,
  type YoutubeQuality,
} from './youtube-downloader.types';

type Job = {
  owner: string;
  view: YoutubeJobView;
  abort: AbortController;
  done: Promise<void>;
  directory: string | null;
  file: string | null;
  deadline: number;
  leases: number;
  ticketHash: string | null;
  ticketExpires: number;
  removing: Promise<void> | null;
  running: boolean;
};

@Injectable()
export class YoutubeDownloaderService implements OnModuleDestroy {
  private readonly jobs = new Map<string, Job>();
  private readonly previews = new Map<string, AbortController>();
  private readonly previewWork = new Set<Promise<YoutubePreview>>();
  private active = 0;
  private transfers = 0;
  private stopping = false;
  private readonly cleanup = setInterval(() => {
    void this.sweep().catch(() => undefined);
  }, 15_000);

  constructor(
    private readonly config: ConfigService,
    private readonly runner: YoutubeDownloaderRunner,
  ) {
    this.cleanup.unref();
  }

  async preview(owner: string, input: string) {
    const { url } = normalizeYoutubeUrl(input);
    if (this.stopping || this.previews.size >= 2 || this.previews.has(owner))
      throw new YoutubeDownloaderError('CAPACITY', 429);
    const abort = new AbortController();
    this.previews.set(owner, abort);
    const work = this.runner.preview(url, abort.signal);
    this.previewWork.add(work);
    try {
      return await work;
    } finally {
      this.previews.delete(owner);
      this.previewWork.delete(work);
    }
  }

  async createJob(owner: string, input: string, quality: YoutubeQuality): Promise<YoutubeJobView> {
    const { url } = normalizeYoutubeUrl(input);
    if (!YOUTUBE_QUALITIES.includes(quality)) throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
    for (const [id, job] of this.jobs) {
      if (!job.running && !job.directory && !job.leases) this.jobs.delete(id);
    }
    if (
      this.stopping ||
      this.active >= YOUTUBE_LIMITS.activeJobs ||
      this.jobs.size >= YOUTUBE_LIMITS.retainedJobs ||
      [...this.jobs.values()].some((job) => job.owner === owner && job.running)
    )
      throw new YoutubeDownloaderError('CAPACITY', 429);
    const id = randomUUID();
    const job: Job = {
      owner,
      view: { id, status: 'preparing', expiresAt: null },
      abort: new AbortController(),
      done: Promise.resolve(),
      directory: null,
      file: null,
      deadline: Date.now() + YOUTUBE_LIMITS.preparationTimeoutMs,
      leases: 0,
      ticketHash: null,
      ticketExpires: 0,
      removing: null,
      running: true,
    };
    // Reserve synchronously: simultaneous requests cannot pass the same capacity check.
    this.jobs.set(id, job);
    this.active += 1;
    const initial = { ...job.view };
    job.done = this.prepare(job, url, quality);
    return initial;
  }

  private async prepare(job: Job, url: string, quality: YoutubeQuality) {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      job.abort.abort();
    }, YOUTUBE_LIMITS.preparationTimeoutMs);
    try {
      const preview = await this.runner.preview(url, job.abort.signal);
      if (!preview.qualities.includes(quality))
        throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
      if (job.abort.signal.aborted) throw new YoutubeDownloaderError('CANCELLED');
      const root = this.config.get<string>('YOUTUBE_DOWNLOADER_TEMP_DIR')?.trim() || tmpdir();
      await mkdir(root, { recursive: true });
      job.directory = await mkdtemp(join(root, 'chlatwork-youtube-'));
      const output = await this.runner.download(url, quality, job.directory, job.abort.signal);
      if (job.abort.signal.aborted) throw new YoutubeDownloaderError('CANCELLED');
      job.file = output.path;
      job.view = {
        id: job.view.id,
        status: 'ready',
        expiresAt: null,
        fileName: `${preview.videoId}-${quality}p.mp4`,
        sizeBytes: output.sizeBytes,
      };
    } catch (error) {
      const code = timedOut
        ? 'TIMEOUT'
        : job.view.status === 'cancelled'
          ? 'CANCELLED'
          : error instanceof YoutubeDownloaderError
            ? error.code
            : 'DOWNLOAD_FAILED';
      job.view = {
        id: job.view.id,
        status: code === 'CANCELLED' ? 'cancelled' : 'failed',
        expiresAt: null,
        errorCode: code,
      };
      // Failed cleanup retains the job's directory reference and capacity for retry by sweep.
      await this.removeFiles(job).catch(() => undefined);
    } finally {
      clearTimeout(timeout);
      this.active -= 1;
      job.running = false;
      job.deadline = Date.now() + YOUTUBE_LIMITS.retentionMs;
      job.view.expiresAt = new Date(job.deadline).toISOString();
    }
  }

  private owned(owner: string, id: string) {
    const job = this.jobs.get(id);
    if (!job || job.owner !== owner || job.deadline <= Date.now() || job.view.status === 'expired')
      throw new YoutubeDownloaderError('NOT_FOUND', 404);
    return job;
  }

  getJob(owner: string, id: string): YoutubeJobView {
    return { ...this.owned(owner, id).view };
  }

  async cancelJob(owner: string, id: string) {
    const job = this.owned(owner, id);
    job.ticketHash = null;
    job.view.status = 'cancelled';
    job.abort.abort();
    await job.done;
    if (!job.leases) await this.removeFiles(job);
  }

  issueTicket(owner: string, id: string) {
    const job = this.owned(owner, id);
    if (job.view.status !== 'ready' || !job.file)
      throw new YoutubeDownloaderError('NOT_READY', 409);
    const token = randomBytes(32).toString('hex');
    job.ticketHash = createHash('sha256').update(token).digest('hex');
    job.ticketExpires = Math.min(Date.now() + YOUTUBE_LIMITS.ticketMs, job.deadline);
    return { token, expiresAt: new Date(job.ticketExpires).toISOString() };
  }

  leaseDownload(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token)) throw new YoutubeDownloaderError('NOT_FOUND', 404);
    const hash = createHash('sha256').update(token).digest('hex');
    const job = [...this.jobs.values()].find((item) => item.ticketHash === hash);
    if (
      !job ||
      job.view.status !== 'ready' ||
      !job.file ||
      job.deadline <= Date.now() ||
      job.ticketExpires <= Date.now() ||
      this.stopping
    )
      throw new YoutubeDownloaderError('NOT_FOUND', 404);
    if (job.leases || this.transfers >= 2) throw new YoutubeDownloaderError('CAPACITY', 429);
    job.leases += 1;
    this.transfers += 1;
    let released = false;
    return {
      path: job.file,
      fileName: job.view.fileName!,
      sizeBytes: job.view.sizeBytes!,
      release: async () => {
        if (released) return;
        released = true;
        job.leases -= 1;
        this.transfers -= 1;
        if (this.stopping || job.deadline <= Date.now() || job.view.status !== 'ready')
          await this.removeFiles(job);
        await this.sweep();
      },
    };
  }

  private async removeFiles(job: Job) {
    if (job.leases || !job.directory) return;
    if (job.removing) return job.removing;
    job.removing = (async () => {
      await rm(job.directory!, { recursive: true, force: true });
      job.directory = null;
      job.file = null;
    })();
    try {
      await job.removing;
    } finally {
      job.removing = null;
    }
  }

  async sweep() {
    for (const [id, job] of this.jobs) {
      if (job.running) continue;
      if ((job.view.status === 'failed' || job.view.status === 'cancelled') && !job.leases)
        await this.removeFiles(job);
      if (job.deadline > Date.now()) continue;
      job.view.status = 'expired';
      job.ticketHash = null;
      if (!job.leases) {
        await this.removeFiles(job);
        this.jobs.delete(id);
      }
    }
  }

  async onModuleDestroy() {
    this.stopping = true;
    clearInterval(this.cleanup);
    for (const abort of this.previews.values()) abort.abort();
    for (const job of this.jobs.values()) job.abort.abort();
    await Promise.allSettled([
      ...this.previewWork,
      ...[...this.jobs.values()].map((job) => job.done),
    ]);
    await Promise.all(
      [...this.jobs.values()].filter((job) => !job.leases).map((job) => this.removeFiles(job)),
    );
  }
}
