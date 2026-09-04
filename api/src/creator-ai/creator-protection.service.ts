import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature, AiGenerationStatus, type Prisma } from '@prisma/client';

const VIDEO_FEATURES = [
  AiFeature.VIDEO_SUBTITLE,
  AiFeature.VIDEO_CAPTION,
  AiFeature.VIDEO_SUMMARY,
  AiFeature.VIDEO_CONTENT_PACK,
  AiFeature.VIDEO_TO_SOCIAL,
];
import { CreatorAiException, creatorAiUnavailable } from './creator-ai.errors';
import { CreatorPlanLimitsService } from './creator-plan-limits.service';

@Injectable()
export class CreatorProtectionService {
  constructor(
    private readonly config: ConfigService,
    private readonly plans: CreatorPlanLimitsService,
  ) {}

  assertEnabled() {
    if (String(this.config.get('AI_ENABLED')).toLowerCase() !== 'true') {
      throw creatorAiUnavailable();
    }
  }

  async assertCanReserve(
    tx: Prisma.TransactionClient,
    userId: string,
    credits: number,
    estimatedProviderCostUsd: number,
    isVideo: boolean,
  ) {
    this.assertEnabled();
    const limits = this.plans.forUser(userId);
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60_000);
    const hourAgo = new Date(now.getTime() - 3_600_000);
    const [minuteCount, hourCount] = await Promise.all([
      tx.aiGeneration.count({
        where: { userId, createdAt: { gte: minuteAgo } },
      }),
      tx.aiGeneration.count({
        where: { userId, createdAt: { gte: hourAgo } },
      }),
    ]);
    if (
      minuteCount >= limits.ratePerMinute ||
      hourCount >= limits.ratePerHour
    ) {
      throw new CreatorAiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'AI_RATE_LIMITED',
        'Too many AI requests. Please wait and try again.',
      );
    }

    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const daily = await tx.aiGeneration.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        status: {
          in: [
            AiGenerationStatus.RESERVED,
            AiGenerationStatus.PROCESSING,
            AiGenerationStatus.COMPLETED,
          ],
        },
      },
      _sum: { creditCost: true },
    });
    if ((daily._sum.creditCost ?? 0) + credits > limits.dailyCredits) {
      throw new CreatorAiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'AI_DAILY_LIMIT_REACHED',
        'Your daily AI usage limit has been reached. Please try again tomorrow.',
      );
    }

    if (isVideo) {
      const activeVideoJobs = await tx.aiGeneration.count({
        where: {
          userId,
          feature: { in: VIDEO_FEATURES },
          status: {
            in: [
              AiGenerationStatus.RESERVED,
              AiGenerationStatus.PROCESSING,
            ],
          },
        },
      });
      if (activeVideoJobs >= limits.maxConcurrentVideoJobs) {
        throw new CreatorAiException(
          HttpStatus.TOO_MANY_REQUESTS,
          'AI_RATE_LIMITED',
          'Your current video must finish before another one can start.',
        );
      }
    }

    await this.assertGlobalBudget(tx, now, estimatedProviderCostUsd);
  }

  private async assertGlobalBudget(
    tx: Prisma.TransactionClient,
    now: Date,
    nextEstimate: number,
  ) {
    const dailyBudget = this.number('AI_DAILY_PROVIDER_BUDGET_USD', 0);
    const monthlyBudget = this.number('AI_MONTHLY_PROVIDER_BUDGET_USD', 0);
    if (dailyBudget <= 0 || monthlyBudget <= 0) throw creatorAiUnavailable();

    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const [dailyUsage, monthlyUsage, active] = await Promise.all([
      tx.aiUsageLog.aggregate({
        where: { createdAt: { gte: day } },
        _sum: { estimatedProviderCostUsd: true },
      }),
      tx.aiUsageLog.aggregate({
        where: { createdAt: { gte: month } },
        _sum: { estimatedProviderCostUsd: true },
      }),
      tx.aiGeneration.aggregate({
        where: {
          status: {
            in: [AiGenerationStatus.RESERVED, AiGenerationStatus.PROCESSING],
          },
        },
        _sum: { estimatedProviderCostUsd: true },
      }),
    ]);
    const activeCost = Number(active._sum.estimatedProviderCostUsd ?? 0);
    if (
      Number(dailyUsage._sum.estimatedProviderCostUsd ?? 0) +
          activeCost +
          nextEstimate >
        dailyBudget ||
      Number(monthlyUsage._sum.estimatedProviderCostUsd ?? 0) +
          activeCost +
          nextEstimate >
        monthlyBudget
    ) {
      throw creatorAiUnavailable();
    }
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
