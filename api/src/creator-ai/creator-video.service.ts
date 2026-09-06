import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiFeature, AiVideoJobStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatorAiException,
  creatorOutputLanguageRejected,
} from './creator-ai.errors';
import { containsThaiScript } from './creator-output-language';
import { CreatorCreditsService } from './creator-credits.service';
import { CreatorPlanLimitsService } from './creator-plan-limits.service';
import { CreatorPricingService } from './creator-pricing.service';
import { CreatorVideoToolsService } from './creator-video-tools.service';
import type { CreatorVideoUpload } from './creator-video-upload';

const VIDEO_FEATURES = new Set<AiFeature>([
  AiFeature.VIDEO_SUBTITLE,
  AiFeature.VIDEO_CAPTION,
  AiFeature.VIDEO_SUMMARY,
  AiFeature.VIDEO_CONTENT_PACK,
  AiFeature.VIDEO_TO_SOCIAL,
]);

@Injectable()
export class CreatorVideoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreatorCreditsService,
    private readonly pricing: CreatorPricingService,
    private readonly plans: CreatorPlanLimitsService,
    private readonly tools: CreatorVideoToolsService,
  ) {}

  async createJob(
    userId: string,
    feature: AiFeature,
    idempotencyHeader: string | undefined,
    options: Record<string, unknown>,
    file?: CreatorVideoUpload,
  ) {
    if (!VIDEO_FEATURES.has(feature)) {
      throw new CreatorAiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_VIDEO',
        'Unknown video workflow.',
      );
    }
    if (!file) {
      throw new CreatorAiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_VIDEO',
        'Choose an audio file to upload.',
      );
    }

    try {
      const key = this.credits.validateIdempotencyKey(idempotencyHeader);
      const limits = this.plans.forUser(userId);
      if (file.size <= 0) {
        throw new CreatorAiException(
          HttpStatus.BAD_REQUEST,
          'INVALID_VIDEO',
          'The uploaded file is empty.',
        );
      }
      if (file.size > limits.maxVideoBytes) {
        throw new CreatorAiException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          'VIDEO_TOO_LARGE',
          'This media file is larger than your current plan allows.',
        );
      }
      if (!(await this.tools.validateMagic(file.path, file.mimetype))) {
        throw new CreatorAiException(
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
          'UNSUPPORTED_VIDEO_FORMAT',
          'The uploaded file does not contain supported audio or video.',
        );
      }
      let durationSeconds: number;
      try {
        durationSeconds = await this.tools.duration(file.path, file.mimetype);
      } catch {
        throw new CreatorAiException(
          HttpStatus.BAD_REQUEST,
          'INVALID_VIDEO',
          'The file must contain a valid audio track with a verifiable duration.',
        );
      }
      if (durationSeconds > limits.maxVideoSeconds) {
        throw new CreatorAiException(
          HttpStatus.PAYLOAD_TOO_LARGE,
          'VIDEO_TOO_LONG',
          'This audio or video is longer than your current plan allows.',
          { maximumSeconds: limits.maxVideoSeconds },
        );
      }
      const fileHash = await this.tools.hashFile(file.path);
      const requestHash = createHash('sha256')
        .update(fileHash)
        .update(JSON.stringify(options))
        .digest('hex');
      const cost = this.pricing.video(feature, durationSeconds);
      const reservation = await this.credits.reserve({
        userId,
        feature,
        idempotencyKey: key,
        requestHash,
        inputSummary: this.summary(feature, options),
        credits: cost,
        isVideo: true,
      });

      if (reservation.kind === 'existing') {
        await this.tools.remove(file.path);
        const existing = await this.prisma.aiVideoJob.findUnique({
          where: { generationId: reservation.generation.id },
        });
        if (!existing) {
          throw new CreatorAiException(
            HttpStatus.CONFLICT,
            'AI_REQUEST_IN_PROGRESS',
            'This video request is already being prepared.',
          );
        }
        return this.jobResponse(
          existing,
          reservation.balance,
          reservation.generation.result,
          reservation.generation.creditCost,
        );
      }

      try {
        const job = await this.prisma.aiVideoJob.create({
          data: {
            generationId: reservation.generation.id,
            userId,
            feature,
            originalName: this.tools.safeOriginalName(file.originalname),
            mimeType: file.mimetype,
            byteSize: BigInt(file.size),
            durationSeconds,
            tempFilePath: file.path,
          },
        });
        return this.jobResponse(
          job,
          reservation.balance,
          null,
          reservation.generation.creditCost,
        );
      } catch {
        await this.credits.refund(
          reservation.generation.id,
          'AI_GENERATION_FAILED',
        );
        throw new CreatorAiException(
          HttpStatus.INTERNAL_SERVER_ERROR,
          'AI_GENERATION_FAILED',
          'The video job could not be created. Your credits were restored.',
        );
      }
    } catch (error) {
      await this.tools.remove(file.path);
      throw error;
    }
  }

  async getJob(userId: string, jobId: string) {
    const job = await this.prisma.aiVideoJob.findFirst({
      where: { id: jobId, userId },
      include: { generation: { select: { result: true, creditCost: true } } },
    });
    if (!job) {
      throw new CreatorAiException(
        HttpStatus.NOT_FOUND,
        'AI_JOB_NOT_FOUND',
        'Video job not found.',
      );
    }
    const balance = (await this.credits.getBalance(userId)).balance;
    return this.jobResponse(
      job,
      balance,
      job.generation.result,
      job.generation.creditCost,
    );
  }

  async subtitles(userId: string, jobId: string) {
    const job = await this.prisma.aiVideoJob.findFirst({
      where: { id: jobId, userId, status: AiVideoJobStatus.COMPLETED },
      include: { generation: { select: { result: true } } },
    });
    const result = job?.generation.result;
    if (
      !job ||
      !result ||
      typeof result !== 'object' ||
      Array.isArray(result)
    ) {
      throw new CreatorAiException(
        HttpStatus.NOT_FOUND,
        'AI_JOB_NOT_FOUND',
        'Completed subtitles were not found.',
      );
    }
    if (containsThaiScript(result)) throw creatorOutputLanguageRejected();
    const srt = (result as Record<string, unknown>).srt;
    if (typeof srt !== 'string' || !srt.trim()) {
      throw new CreatorAiException(
        HttpStatus.NOT_FOUND,
        'AI_JOB_NOT_FOUND',
        'This job does not contain subtitles.',
      );
    }
    const basename = job.originalName.replace(/\.[^.]+$/, '');
    return {
      filename: `${!basename || containsThaiScript(basename) ? 'chlatwork-subtitles' : basename}.srt`,
      content: srt,
    };
  }

  private jobResponse(
    job: {
      id: string;
      status: AiVideoJobStatus;
      stage: string;
      durationSeconds: number;
      generationId: string;
    },
    balance: number,
    result: unknown,
    creditCost: number,
  ) {
    if (containsThaiScript(result)) throw creatorOutputLanguageRejected();
    return {
      data: {
        jobId: job.id,
        generationId: job.generationId,
        status: job.status,
        stage: job.stage,
        durationSeconds: job.durationSeconds,
        ...(job.status === AiVideoJobStatus.COMPLETED && result
          ? { result }
          : {}),
      },
      usage: {
        creditsRemaining: balance,
        creditsCharged:
          job.status === AiVideoJobStatus.COMPLETED ? creditCost : 0,
        creditsReserved:
          job.status === AiVideoJobStatus.QUEUED ||
          job.status === AiVideoJobStatus.PROCESSING ||
          job.status === AiVideoJobStatus.TRANSCRIBING ||
          job.status === AiVideoJobStatus.CLEANING ||
          job.status === AiVideoJobStatus.GENERATING
            ? creditCost
            : 0,
        final: job.status === AiVideoJobStatus.COMPLETED,
      },
    };
  }

  private summary(feature: AiFeature, options: Record<string, unknown>) {
    const label = feature
      .toLowerCase()
      .split('_')
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ');
    return `${label}|${String(options.language ?? 'KHMER')}|${String(options.tone ?? 'NATURAL')}`;
  }
}
