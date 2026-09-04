import { AiFeature } from '@prisma/client';

export const CREATOR_AI_DEFAULTS = {
  initialCredits: 20,
  estimatedProviderUsdPerCredit: 0.02,
  providerTimeoutMs: 60_000,
  videoWorkerPollMs: 1_500,
  videoMaintenanceMs: 60 * 60_000,
  videoStaleMinutes: 30,
  generationRetentionDays: 30,
  videoTempDirectoryName: 'chlatwork-creator',
  absoluteMaxVideoBytes: 500 * 1024 * 1024,
  ffmpegPath: 'ffmpeg',
  ffprobePath: 'ffprobe',
} as const;

export const CREATOR_FREE_PLAN_LIMITS = {
  ratePerMinute: 5,
  ratePerHour: 20,
  dailyCredits: 10,
  maxVideoMinutes: 3,
  maxVideoBytes: 100 * 1024 * 1024,
  maxConcurrentVideoJobs: 1,
} as const;

export const CREATOR_FIXED_CREDIT_PRICES: Readonly<
  Partial<Record<AiFeature, number>>
> = {
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

export const CREATOR_VIDEO_CREDIT_PRICES: Readonly<
  Partial<Record<AiFeature, number>>
> = {
  [AiFeature.VIDEO_CAPTION]: 3,
  [AiFeature.VIDEO_SUMMARY]: 3,
  [AiFeature.VIDEO_TO_SOCIAL]: 3,
  [AiFeature.VIDEO_SUBTITLE]: 5,
  [AiFeature.VIDEO_CONTENT_PACK]: 7,
};
