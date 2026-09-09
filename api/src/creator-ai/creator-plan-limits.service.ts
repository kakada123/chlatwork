import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiGenerationStatus, type Prisma } from '@prisma/client';
import { CREATOR_FREE_PLAN_LIMITS } from './creator-ai.config';

export interface CreatorPlanLimits {
  ratePerMinute: number;
  ratePerHour: number;
  dailyCredits: number;
  maxVideoSeconds: number;
  maxVideoBytes: number;
  maxConcurrentVideoJobs: number;
}

@Injectable()
export class CreatorPlanLimitsService {
  constructor(private readonly config: ConfigService) {}

  // These are shared defaults; dailyUsage applies the account's saved override.
  forUser(_userId: string): CreatorPlanLimits {
    return {
      ratePerMinute: this.number(
        'AI_FREE_RATE_LIMIT_PER_MINUTE',
        CREATOR_FREE_PLAN_LIMITS.ratePerMinute,
      ),
      ratePerHour: this.number(
        'AI_FREE_RATE_LIMIT_PER_HOUR',
        CREATOR_FREE_PLAN_LIMITS.ratePerHour,
      ),
      dailyCredits: this.number(
        'AI_FREE_DAILY_CREDIT_LIMIT',
        CREATOR_FREE_PLAN_LIMITS.dailyCredits,
      ),
      maxVideoSeconds:
        this.number(
          'AI_FREE_MAX_VIDEO_MINUTES',
          CREATOR_FREE_PLAN_LIMITS.maxVideoMinutes,
        ) * 60,
      maxVideoBytes: this.number(
        'AI_FREE_MAX_VIDEO_BYTES',
        CREATOR_FREE_PLAN_LIMITS.maxVideoBytes,
      ),
      maxConcurrentVideoJobs: this.number(
        'AI_FREE_MAX_CONCURRENT_VIDEO_JOBS',
        CREATOR_FREE_PLAN_LIMITS.maxConcurrentVideoJobs,
      ),
    };
  }

  async dailyUsage(
    tx: Pick<Prisma.TransactionClient, 'user' | 'aiGeneration'>,
    userId: string,
    now = new Date(),
  ) {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const [user, daily] = await Promise.all([
      tx.user.findUnique({
        where: { id: userId },
        select: { aiDailyCreditLimit: true },
      }),
      tx.aiGeneration.aggregate({
        where: {
          userId,
          createdAt: { gte: start },
          // Pending reservations count immediately; failed/refunded work does not.
          status: {
            in: [
              AiGenerationStatus.RESERVED,
              AiGenerationStatus.PROCESSING,
              AiGenerationStatus.COMPLETED,
            ],
          },
        },
        _sum: { creditCost: true },
      }),
    ]);
    const defaultLimit = this.forUser(userId).dailyCredits;
    const override = user?.aiDailyCreditLimit ?? null;
    const limit = override ?? defaultLimit;
    const used = daily._sum.creditCost ?? 0;
    return {
      override,
      defaultLimit,
      limit,
      used,
      remaining: Math.max(0, limit - used),
      resetsAt: new Date(start.getTime() + 86400000).toISOString(),
    };
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
