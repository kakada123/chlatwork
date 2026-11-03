export interface BirthdayAudioTrack {
  id: string;
  title: string;
  src: string;
  durationMs: number;
}

export interface BirthdayAudioClip {
  trackId: string;
  startMs: number;
  endMs: number;
}

const trackIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** The backend owns the catalog; only its same-origin audio routes are playable. */
export function readBirthdayAudioCatalog(value: unknown): BirthdayAudioTrack[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid birthday music catalog");
  const seen = new Set<string>();
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Invalid birthday music track");
    const { id, title, src, durationMs } = item as Record<string, unknown>;
    if (typeof id !== "string" || !trackIdPattern.test(id) || seen.has(id) ||
        typeof title !== "string" || !title.trim() || title.length > 150 ||
        src !== `/api/moments/birthday-audio/${id}` || typeof durationMs !== "number" ||
        !Number.isSafeInteger(durationMs) || durationMs < 1000) throw new Error("Invalid birthday music track");
    seen.add(id);
    return { id, title: title.trim(), src, durationMs };
  });
}

export function getBirthdayAudioTrack(id: unknown, tracks: readonly BirthdayAudioTrack[]) {
  return tracks.find((track) => track.id === id);
}

export function readBirthdayAudioClip(value: unknown, tracks?: readonly BirthdayAudioTrack[]): BirthdayAudioClip | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { trackId, startMs, endMs } = value as Record<string, unknown>;
  if (typeof trackId !== "string" || !trackIdPattern.test(trackId) ||
      typeof startMs !== "number" || typeof endMs !== "number" ||
      !Number.isSafeInteger(startMs) || !Number.isSafeInteger(endMs) || startMs < 0 || endMs - startMs < 1000) return null;
  if (tracks) {
    const track = getBirthdayAudioTrack(trackId, tracks);
    if (!track || endMs > track.durationMs) return null;
  }
  return { trackId, startMs, endMs };
}

export function formatBirthdayAudioTime(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
