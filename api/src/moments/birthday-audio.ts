// Server-owned allowlist: persisted clips reference track IDs, never filenames or arbitrary URLs.
export const BIRTHDAY_AUDIO_TRACKS = [
  {
    id: 'hbd-001',
    title: 'Happy Birthday · 01',
    fileName: 'hbd-001.m4a',
    durationMs: 174265,
  },
  {
    id: 'hbd-002',
    title: 'Kert Jom Ngy Ot Luy · 02',
    fileName: 'hbd-002-kert-jom-ngy-ot-luy.m4a',
    durationMs: 41470,
  },
  {
    id: 'hbd-003',
    title: 'Birthday Remix · 03',
    fileName: 'hbd-003-remix.m4a',
    durationMs: 196834,
  },
  {
    id: 'hbd-004',
    title: 'Kmeng Toch · 04',
    fileName: 'hbd-004-kmeng-toch.m4a',
    durationMs: 260596,
  },
  {
    id: 'hbd-005',
    title: 'Jas Hx Tver BD Teat · 05',
    fileName: 'hbd-005-jas-hx-tver-bd-teat.m4a',
    durationMs: 19400,
  },
  {
    id: 'hbd-006',
    title: 'Birthday Remix · 06',
    fileName: 'hdb-006-remix.m4a',
    durationMs: 285047,
  },
  {
    id: 'hbd-007',
    title: 'Sis & Bro · 07',
    fileName: 'hbd-007-sis-bro.m4a',
    durationMs: 236000,
  },
  {
    id: 'hbd-008',
    title: 'Noly · 08',
    fileName: 'hdb-008-noly.m4a',
    durationMs: 264364,
  },
  {
    id: 'hbd-009',
    title: 'Casual Birthday · 09',
    fileName: 'hdb-009-casual.m4a',
    durationMs: 231014,
  },
  {
    id: 'hbd-010',
    title: 'HBD O Sml · 10',
    fileName: 'hdb-010-hbd-o-sml.m4a',
    durationMs: 207562,
  },
] as const;

export interface BirthdayAudioClip {
  trackId: string;
  startMs: number;
  endMs: number;
}

export function getBirthdayAudioTrack(id: unknown) {
  return BIRTHDAY_AUDIO_TRACKS.find((track) => track.id === id);
}

export function readBirthdayAudioClip(
  value: unknown,
): BirthdayAudioClip | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { trackId, startMs, endMs } = value as Record<string, unknown>;
  const track = getBirthdayAudioTrack(trackId);
  if (
    !track ||
    typeof startMs !== 'number' ||
    typeof endMs !== 'number' ||
    !Number.isSafeInteger(startMs) ||
    !Number.isSafeInteger(endMs) ||
    startMs < 0 ||
    endMs - startMs < 1000 ||
    endMs > track.durationMs
  )
    return null;
  return { trackId: track.id, startMs, endMs };
}

export function formatBirthdayAudioTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
