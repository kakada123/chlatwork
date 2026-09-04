import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFeature } from '@prisma/client';

const DEFAULT_FIXED_PRICES: Partial<Record<AiFeature, number>> = {
  [AiFeature.POST]: 2,
  [AiFeature.SCRIPT]: 4,
  [AiFeature.HOOK]: 1,
  [AiFeature.CONTENT_IDEAS]: 2,
  [AiFeature.KHMER_GRAMMAR]: 1,
  [AiFeature.KHMER_REWRITE]: 1,
  [AiFeature.LATIN_TO_KHMER]: 1,
  [AiFeature.HUMANIZE]: 1,
  [AiFeature.FACEBOOK_TO_TIKTOK]: 2,
  [AiFeature.LONG_TO_SHORT]: 2,
};

const DEFAULT_VIDEO_PRICES: Partial<Record<AiFeature, number>> = {
  [AiFeature.VIDEO_CAPTION]: 3,
  [AiFeature.VIDEO_SUMMARY]: 3,
  [AiFeature.VIDEO_TO_SOCIAL]: 3,
  [AiFeature.VIDEO_SUBTITLE]: 5,
  [AiFeature.VIDEO_CONTENT_PACK]: 7,
};

@Injectable()
export class CreatorPricingService {
  constructor(private readonly config: ConfigService) {}

  fixed(feature: AiFeature) {
    const fallback = DEFAULT_FIXED_PRICES[feature];
    if (!fallback) throw new Error(`No fixed Creator price for ${feature}`);
    return this.number(`AI_CREDIT_PRICE_${feature}`, fallback);
  }

  video(feature: AiFeature, durationSeconds: number) {
    const perMinute = DEFAULT_VIDEO_PRICES[feature];
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
      this.number('AI_PROVIDER_ESTIMATED_USD_PER_CREDIT', 0.02)
    );
  }

  private number(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) ? value : fallback;
  }
}
