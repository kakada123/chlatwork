import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';
import {
  CREATOR_AI_DEFAULTS,
  CREATOR_FIXED_CREDIT_PRICES,
  CREATOR_VIDEO_CREDIT_PRICES,
} from './creator-ai.config';

@Injectable()
export class CreatorPricingService {
  constructor(private readonly config: ConfigService) {}

  fixed(feature: AiFeature) {
    const fallback = CREATOR_FIXED_CREDIT_PRICES[feature];
    if (!fallback) throw new Error(`No fixed Creator price for ${feature}`);
    return this.number(`AI_CREDIT_PRICE_${feature}`, fallback);
  }

  video(feature: AiFeature, durationSeconds: number) {
    const perMinute = CREATOR_VIDEO_CREDIT_PRICES[feature];
    if (!perMinute) throw new Error(`No video Creator price for ${feature}`);
    const configured = this.number(
      `AI_CREDIT_PRICE_${feature}_PER_MINUTE`,
      perMinute,
    );
    // Only server-observed duration reaches this calculation.
    return Math.max(1, Math.ceil(durationSeconds / 60)) * configured;
  }

  estimatedProviderCost(credits: number) {
    return (
      credits *
      this.number(
        'AI_PROVIDER_ESTIMATED_USD_PER_CREDIT',
        CREATOR_AI_DEFAULTS.estimatedProviderUsdPerCredit,
      )
    );
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
