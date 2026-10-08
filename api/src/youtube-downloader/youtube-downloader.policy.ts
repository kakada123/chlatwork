import { YoutubeDownloaderError } from './youtube-downloader.errors';
import {
  YOUTUBE_LIMITS,
  YOUTUBE_QUALITIES,
  type YoutubePreview,
  type YoutubeQuality,
} from './youtube-downloader.types';

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

export function normalizeYoutubeUrl(input: string) {
  try {
    if (typeof input !== 'string' || input.length > 2048) throw new Error();
    const url = new URL(input.trim());
    if (
      url.protocol !== 'https:' ||
      !HOSTS.has(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      throw new Error();
    let videoId: string | null = null;
    if (url.hostname.endsWith('youtu.be')) {
      videoId = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    } else if (url.pathname === '/watch') {
      if (url.searchParams.getAll('v').length !== 1) throw new Error();
      videoId = url.searchParams.get('v');
    } else {
      videoId = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    if (!videoId || !VIDEO_ID.test(videoId)) throw new Error();
    // Reconstruct rather than forward a URL: tracking, playlist and redirect parameters never reach yt-dlp.
    return { videoId, url: `https://www.youtube.com/watch?v=${videoId}` };
  } catch {
    throw new YoutubeDownloaderError('INVALID_URL');
  }
}

type MediaFormat = {
  ext?: string;
  vcodec?: string;
  acodec?: string;
  height?: number;
  width?: number;
  format_id?: string;
  tbr?: number;
  has_drm?: boolean;
  filesize?: number;
  filesize_approx?: number;
};

function youtubeSelection(raw: unknown, expectedVideoId: string) {
  const info = raw as Record<string, unknown> | null;
  const duration = info?.duration;
  if (
    !info ||
    info.id !== expectedVideoId ||
    typeof duration !== 'number' ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > YOUTUBE_LIMITS.durationSeconds ||
    info.is_live ||
    info.has_drm ||
    Number(info.age_limit) > 0 ||
    ['is_live', 'is_upcoming', 'post_live'].includes(String(info.live_status)) ||
    (info.availability != null &&
      info.availability !== 'public' &&
      info.availability !== 'unlisted')
  ) {
    throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
  }
  const formats = (Array.isArray(info.formats) ? info.formats : []) as MediaFormat[];
  const safe = formats.filter(
    (f) =>
      f &&
      typeof f === 'object' &&
      !f.has_drm &&
      typeof f.format_id === 'string' &&
      /^[A-Za-z0-9_.-]{1,80}$/.test(f.format_id),
  );
  const bytes = (f: MediaFormat) => Number(f.filesize ?? f.filesize_approx) || 0;
  const codec = (value: unknown, prefix: string) =>
    typeof value === 'string' && value.startsWith(prefix);
  const audios = safe
    .filter(
      (f) =>
        f.ext === 'm4a' &&
        f.vcodec === 'none' &&
        codec(f.acodec, 'mp4a') &&
        bytes(f) <= YOUTUBE_LIMITS.fileBytes,
    )
    .sort((a, b) => (Number(b.tbr) || 0) - (Number(a.tbr) || 0));
  const selections = new Map<YoutubeQuality, string>();
  for (const quality of YOUTUBE_QUALITIES) {
    // Portrait Shorts use their shorter dimension (720x1280 is 720p), like landscape video.
    const videos = safe
      .filter((f) => {
        const height = Number(f.height);
        const width = Number(f.width) || height;
        return (
          f.ext === 'mp4' &&
          codec(f.vcodec, 'avc1') &&
          Math.min(width, height) === quality &&
          Math.max(width, height) <= quality * 2 &&
          bytes(f) <= YOUTUBE_LIMITS.fileBytes
        );
      })
      .sort((a, b) => (Number(b.tbr) || 0) - (Number(a.tbr) || 0));
    const progressive = videos.find((f) => codec(f.acodec, 'mp4a'));
    if (progressive) {
      selections.set(quality, progressive.format_id!);
      continue;
    }
    for (const video of videos) {
      const audio = audios.find((f) => bytes(video) + bytes(f) <= YOUTUBE_LIMITS.fileBytes);
      if (video.acodec === 'none' && audio) {
        selections.set(quality, `${video.format_id}+${audio.format_id}`);
        break;
      }
    }
  }
  const qualities = [...selections.keys()];
  if (!qualities.length) throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
  const preview: YoutubePreview = {
    videoId: expectedVideoId,
    title:
      (typeof info.title === 'string'
        ? info.title.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 200)
        : '') || 'YouTube video',
    thumbnailUrl: `https://i.ytimg.com/vi/${expectedVideoId}/hqdefault.jpg`,
    durationSeconds: Math.ceil(duration),
    qualities,
  };
  return { preview, selections };
}

export function readYoutubePreview(raw: unknown, expectedVideoId: string): YoutubePreview {
  return youtubeSelection(raw, expectedVideoId).preview;
}

export function selectYoutubeFormat(
  raw: unknown,
  expectedVideoId: string,
  quality: YoutubeQuality,
) {
  const selection = youtubeSelection(raw, expectedVideoId).selections.get(quality);
  if (!selection) throw new YoutubeDownloaderError('UNSUPPORTED_VIDEO');
  return selection;
}
