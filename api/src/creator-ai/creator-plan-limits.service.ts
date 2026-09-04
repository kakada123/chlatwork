import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
      ratePerMinute: this.number('AI_FREE_RATE_LIMIT_PER_MINUTE', 5),
      ratePerHour: this.number('AI_FREE_RATE_LIMIT_PER_HOUR', 20),
      dailyCredits: this.number('AI_FREE_DAILY_CREDIT_LIMIT', 10),
      maxVideoSeconds: this.number('AI_FREE_MAX_VIDEO_MINUTES', 3) * 60,
      maxVideoBytes: this.number('AI_FREE_MAX_VIDEO_BYTES', 100 * 1024 * 1024),
      maxConcurrentVideoJobs: this.number(
        'AI_FREE_MAX_CONCURRENT_VIDEO_JOBS',
        1,
      ),
    };
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
