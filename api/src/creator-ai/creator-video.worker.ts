import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiFeature,
  AiGenerationStatus,
  AiVideoJobStatus,
  Prisma,
  type AiVideoJob,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CREATOR_AI_DEFAULTS } from './creator-ai.config';
import { CreatorAiGatewayService } from './creator-ai-gateway.service';
import { CreatorCreditsService } from './creator-credits.service';
import {
  buildTranscriptCleanupPrompt,
  buildVideoContentPrompt,
} from './creator-prompts';
import type {
  CreatorGenerationResult,
  CreatorProviderUsage,
  TranscriptSegment,
} from './creator-ai.types';
import { CreatorVideoToolsService } from './creator-video-tools.service';

const ACTIVE_JOB_STATUSES = [
  AiVideoJobStatus.QUEUED,
  AiVideoJobStatus.PROCESSING,
  AiVideoJobStatus.TRANSCRIBING,
  AiVideoJobStatus.CLEANING,
  AiVideoJobStatus.GENERATING,
];

type ClaimedVideoJob = AiVideoJob & {
  generation: { inputSummary: string | null };
};

@Injectable()
export class CreatorVideoWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CreatorVideoWorker.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gateway: CreatorAiGatewayService,
    private readonly credits: CreatorCreditsService,
    private readonly tools: CreatorVideoToolsService,
  ) {}

  onModuleInit() {
    void this.recoverStaleWork();
    this.maintenanceTimer = setInterval(
      () => void this.recoverStaleWork(),
      CREATOR_AI_DEFAULTS.videoMaintenanceMs,
    );
    this.maintenanceTimer.unref();
    if (String(this.config.get('AI_ENABLED')).toLowerCase() !== 'true') return;
    this.timer = setInterval(
      () => void this.tick(),
      this.number(
        'AI_VIDEO_WORKER_POLL_MS',
        CREATOR_AI_DEFAULTS.videoWorkerPollMs,
      ),
    );
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
  }

  private async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.claimNext();
      if (job) await this.process(job);
    } catch {
      this.logger.error('Creator video worker cycle failed');
    } finally {
      this.busy = false;
    }
  }

  private async claimNext() {
    const candidates = await this.prisma.aiVideoJob.findMany({
      where: { status: AiVideoJobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
      take: 25,
      include: { generation: { select: { inputSummary: true } } },
    });
    for (const candidate of candidates) {
      // Temporary uploads are instance-local unless deployment storage is shared.
      // Only the instance that can read the file may claim it from the DB queue.
      if (
        candidate.tempFilePath &&
        !(await this.tools.exists(candidate.tempFilePath))
      ) {
        continue;
      }
      const claimed = await this.prisma.aiVideoJob.updateMany({
        where: { id: candidate.id, status: AiVideoJobStatus.QUEUED },
        data: {
          status: AiVideoJobStatus.PROCESSING,
          stage: 'PROCESSING',
          attempts: { increment: 1 },
          startedAt: new Date(),
        },
      });
      if (claimed.count === 1) return candidate;
    }
    return null;
  }

  private async process(job: ClaimedVideoJob) {
    let audioPath: string | null = null;
    let finalized = false;
    const usages: CreatorProviderUsage[] = [];
    try {
      if (!job.tempFilePath) throw new Error('Video input is unavailable');
      await this.credits.markProcessing(job.generationId);
      audioPath = await this.tools.extractAudio(job.tempFilePath);

      await this.stage(job.id, AiVideoJobStatus.TRANSCRIBING);
      const transcription = await this.gateway.transcribe(
        job.feature,
        `${job.generationId}:transcription`,
        audioPath,
        job.durationSeconds,
      );
      usages.push(transcription.usage);

      await this.stage(job.id, AiVideoJobStatus.CLEANING);
      const cleaned = await this.gateway.generateStructured(
        job.feature,
        `${job.generationId}:cleanup`,
        buildTranscriptCleanupPrompt(transcription.data.segments),
      );
      usages.push(cleaned.usage);
      const segments = preserveTranscriptTiming(
        transcription.data.segments,
        cleaned.data,
      );
      const transcript = segments.map((segment) => segment.text).join(' ');
      const srt = this.tools.srt(segments);

      let result: CreatorGenerationResult;
      if (job.feature === AiFeature.VIDEO_SUBTITLE) {
        result = subtitleResult(transcript, srt);
      } else {
        await this.stage(job.id, AiVideoJobStatus.GENERATING);
        const generated = await this.gateway.generateStructured(
          job.feature,
          `${job.generationId}:content`,
          buildVideoContentPrompt(
            job.feature,
            transcript,
            videoPreferences(job.generation.inputSummary),
          ),
        );
        usages.push(generated.usage);
        result = generated.data;
        if (job.feature === AiFeature.VIDEO_CONTENT_PACK) {
          // Content Pack reuses this one transcript for every downstream asset.
          result.sections.unshift({
            id: 'subtitle',
            label: 'Subtitle',
            content: transcript,
          });
          result.srt = srt;
        }
      }

      await this.credits.complete(
        job.generationId,
        result,
        combineUsage(usages),
      );
      finalized = true;
      await this.prisma.aiVideoJob.update({
        where: { id: job.id },
        data: {
          status: AiVideoJobStatus.COMPLETED,
          stage: 'COMPLETED',
          tempFilePath: null,
          completedAt: new Date(),
        },
      });
      this.logger.log('Creator video job completed', {
        videoJobId: job.id,
        generationId: job.generationId,
        userId: job.userId,
        feature: job.feature,
      });
    } catch {
      if (finalized) {
        await this.prisma.aiVideoJob.updateMany({
          where: { id: job.id },
          data: {
            status: AiVideoJobStatus.COMPLETED,
            stage: 'COMPLETED',
            tempFilePath: null,
            completedAt: new Date(),
          },
        });
        return;
      }
      await this.credits.refund(
        job.generationId,
        'AI_GENERATION_FAILED',
        usages.length ? combineUsage(usages) : undefined,
      );
      await this.prisma.aiVideoJob.updateMany({
        where: { id: job.id, status: { not: AiVideoJobStatus.COMPLETED } },
        data: {
          status: AiVideoJobStatus.FAILED,
          stage: 'FAILED',
          errorCode: 'AI_GENERATION_FAILED',
          tempFilePath: null,
          completedAt: new Date(),
        },
      });
      this.logger.error('Creator video job failed', {
        videoJobId: job.id,
        generationId: job.generationId,
        userId: job.userId,
        feature: job.feature,
      });
    } finally {
      await Promise.all([
        this.tools.remove(audioPath),
        this.tools.remove(job.tempFilePath),
      ]);
    }
  }

  private stage(jobId: string, status: AiVideoJobStatus) {
    return this.prisma.aiVideoJob.update({
      where: { id: jobId },
      data: { status, stage: status },
    });
  }

  private async recoverStaleWork() {
    try {
      const cutoff = new Date(
        Date.now() -
          this.number(
            'AI_VIDEO_STALE_MINUTES',
            CREATOR_AI_DEFAULTS.videoStaleMinutes,
          ) *
            60_000,
      );
      const jobs = await this.prisma.aiVideoJob.findMany({
        where: { status: { in: ACTIVE_JOB_STATUSES }, updatedAt: { lt: cutoff } },
        include: { generation: { select: { status: true } } },
      });
      for (const job of jobs) {
        if (job.generation.status === AiGenerationStatus.COMPLETED) {
          await this.prisma.aiVideoJob.update({
            where: { id: job.id },
            data: { status: AiVideoJobStatus.COMPLETED, stage: 'COMPLETED', tempFilePath: null },
          });
        } else {
          await this.credits.refund(job.generationId, 'AI_GENERATION_FAILED');
          await this.prisma.aiVideoJob.update({
            where: { id: job.id },
            data: { status: AiVideoJobStatus.FAILED, stage: 'FAILED', errorCode: 'AI_GENERATION_FAILED', tempFilePath: null },
          });
        }
        await this.tools.remove(job.tempFilePath);
      }

      const staleText = await this.prisma.aiGeneration.findMany({
        where: {
          status: { in: [AiGenerationStatus.RESERVED, AiGenerationStatus.PROCESSING] },
          updatedAt: { lt: cutoff },
          videoJob: null,
        },
        select: { id: true },
      });
      for (const generation of staleText) {
        await this.credits.refund(generation.id, 'AI_GENERATION_FAILED');
      }

      const retentionCutoff = new Date(
        Date.now() -
          this.number(
            'AI_GENERATION_RETENTION_DAYS',
            CREATOR_AI_DEFAULTS.generationRetentionDays,
          ) *
            86_400_000,
      );
      await this.prisma.aiGeneration.updateMany({
        where: { completedAt: { lt: retentionCutoff }, result: { not: Prisma.DbNull } },
        data: { result: Prisma.DbNull },
      });
    } catch {
      this.logger.error('Creator stale reservation recovery failed');
    }
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}

function subtitleResult(transcript: string, srt: string): CreatorGenerationResult {
  return {
    title: 'Khmer subtitles',
    sections: [{ id: 'subtitle', label: 'Khmer transcript', content: transcript }],
    srt,
  };
}

function combineUsage(usages: CreatorProviderUsage[]): CreatorProviderUsage {
  const sum = (field: 'inputTokens' | 'cachedInputTokens' | 'outputTokens' | 'audioSeconds') => {
    const values = usages.map((usage) => usage[field]).filter((value): value is number => value !== null);
    return values.length ? values.reduce((total, value) => total + value, 0) : null;
  };
  const models = [...new Set(usages.map((usage) => usage.model))];
  return {
    provider: 'OPENAI',
    model: models.length === 1 ? models[0]! : 'multiple-openai-models',
    inputTokens: sum('inputTokens'),
    cachedInputTokens: sum('cachedInputTokens'),
    outputTokens: sum('outputTokens'),
    audioSeconds: sum('audioSeconds'),
    estimatedProviderCostUsd: usages.reduce(
      (total, usage) => total + usage.estimatedProviderCostUsd,
      0,
    ),
    providerRequestId: usages.at(-1)?.providerRequestId ?? null,
    durationMs: usages.reduce((total, usage) => total + usage.durationMs, 0),
  };
}

export const preserveTranscriptTiming = (
  segments: TranscriptSegment[],
  cleanedTexts: string[],
) =>
  segments.map((segment, index) => ({
    ...segment,
    text: cleanedTexts[index] ?? segment.text,
  }));

function videoPreferences(summary: string | null) {
  const [, language = 'KHMER', tone = 'NATURAL'] = (summary ?? '').split('|');
  return { language, tone };
}
