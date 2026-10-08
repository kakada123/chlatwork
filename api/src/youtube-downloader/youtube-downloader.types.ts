export const YOUTUBE_QUALITIES = [360, 480, 720, 1080] as const;
export type YoutubeQuality = (typeof YOUTUBE_QUALITIES)[number];
export type YoutubePreview = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  qualities: YoutubeQuality[];
};
export type YoutubeJobStatus = 'preparing' | 'ready' | 'failed' | 'cancelled' | 'expired';
export type YoutubeJobView = {
  id: string;
  status: YoutubeJobStatus;
  expiresAt: string | null;
  fileName?: string;
  sizeBytes?: number;
  errorCode?: string;
};
export const YOUTUBE_LIMITS = {
  durationSeconds: 1200,
  fileBytes: 200 * 1024 * 1024,
  workingBytes: 450 * 1024 * 1024,
  previewTimeoutMs: 30_000,
  preparationTimeoutMs: 300_000,
  retentionMs: 600_000,
  ticketMs: 120_000,
  activeJobs: 2,
  jobsPerUser: 1,
  retainedJobs: 8,
} as const;
