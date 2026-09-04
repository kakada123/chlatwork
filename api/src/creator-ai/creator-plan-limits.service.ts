import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

  // ChlatWork has no subscription model yet, so every account uses centrally
  // configured FREE safeguards rather than scattered plan checks.
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

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
