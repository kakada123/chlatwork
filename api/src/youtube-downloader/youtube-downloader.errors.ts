import { HttpException } from '@nestjs/common';

const MESSAGES = {
  INVALID_URL: 'Enter a valid YouTube video link.',
  UNSUPPORTED_VIDEO: 'This public video has no supported MP4 download within the limits.',
  UNAVAILABLE: 'The downloader is temporarily unavailable. Please try again later.',
  CAPACITY: 'The downloader is busy. Please try again shortly.',
  NOT_FOUND: 'This download has expired or is unavailable. Please prepare it again.',
  NOT_READY: 'This download is not ready yet.',
  DOWNLOAD_FAILED: 'The video could not be downloaded. Try another public video.',
  UPSTREAM_AUTH_REQUIRED:
    'YouTube requires authentication for this request. This video cannot be downloaded from our server right now.',
  TIMEOUT: 'Preparing the video took too long. Please try a smaller video.',
  TOO_LARGE: 'The video exceeds the download size limit.',
  CANCELLED: 'The download was cancelled.',
} as const;

export type YoutubeErrorCode = keyof typeof MESSAGES;
export type YoutubeProcessDiagnostic = {
  stage: 'health' | 'metadata' | 'download' | 'verify' | 'unknown';
  reason:
    | 'UPSTREAM_FORBIDDEN'
    | 'UPSTREAM_RATE_LIMITED'
    | 'UPSTREAM_AUTH_REQUIRED'
    | 'FFMPEG_UNAVAILABLE'
    | 'CHALLENGE_FAILED'
    | 'DISK_FULL'
    | 'UNKNOWN_PROCESS_FAILURE';
  exitCode: number | null;
};
export class YoutubeDownloaderError extends HttpException {
  constructor(
    public readonly code: YoutubeErrorCode,
    status = 400,
    public readonly diagnostic?: YoutubeProcessDiagnostic,
  ) {
    super({ code, message: MESSAGES[code] }, status);
  }
}
