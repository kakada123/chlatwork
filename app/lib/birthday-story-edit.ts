import { MOMENT_THEMES } from "../data/moments.ts";
import { readBirthdayAudioClip } from "./birthday-audio.ts";
import { createBirthdayStorySettings, readBirthdayStorySettings } from "./birthday-story.ts";
import type { MomentDraft } from "../types/moment.ts";
import { parseBirthdayUnlock } from "./birthday-wizard.ts";

export interface ExistingBirthdayPhoto { id: string; existingMediaId: string; url: string; caption: string; date: string }

/** datetime-local displays browser time; the existing save path converts it back to UTC. */
function localDateTime(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") throw new Error("Invalid saved unlock date");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid saved unlock date");
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Hydrate only the owner edit response, including its authenticated media URLs. */
export function hydrateBirthdayMoment(value: unknown): { draft: Partial<MomentDraft>; photos: ExistingBirthdayPhoto[]; slug: string; status: "DRAFT" | "PUBLISHED" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid birthday Moment");
  const moment = value as Record<string, unknown>;
  if (typeof moment.id !== "string" || typeof moment.slug !== "string" || moment.occasion !== "BIRTHDAY" ||
      typeof moment.recipientName !== "string" || typeof moment.title !== "string" ||
      !MOMENT_THEMES.some(theme => theme.value === moment.theme) || !["DRAFT", "PUBLISHED"].includes(moment.status as string) ||
      !Array.isArray(moment.blocks) || !Array.isArray(moment.media) || moment.media.length > 10) throw new Error("Invalid birthday Moment");
  const block = (type: string): Record<string, unknown> => {
    const entry = (moment.blocks as Record<string, unknown>[]).find(item => item && item.type === type);
    return entry?.data && typeof entry.data === "object" && !Array.isArray(entry.data) ? entry.data as Record<string, unknown> : {};
  };
  const text = (type: string, key: string) => typeof block(type)[key] === "string" ? block(type)[key] as string : "";
  const hero = block("HERO");
  const savedUnlock = moment.birthdayUnlock;
  let birthdayUnlock: { day: number; month: number } | null = null;
  if (savedUnlock !== null && savedUnlock !== undefined) {
    if (typeof savedUnlock !== "object" || Array.isArray(savedUnlock)) throw new Error("Invalid saved birthday unlock");
    const unlock = savedUnlock as Record<string, unknown>;
    if (typeof unlock.day !== "number" || typeof unlock.month !== "number") throw new Error("Invalid saved birthday unlock");
    birthdayUnlock = parseBirthdayUnlock(String(unlock.day), String(unlock.month));
    if (!birthdayUnlock) throw new Error("Invalid saved birthday unlock");
  }
  const story = hero.birthdayStory === undefined ? createBirthdayStorySettings() : readBirthdayStorySettings(hero.birthdayStory);
  if (!story) throw new Error("Invalid saved birthday story");
  const audio = hero.birthdayAudio === undefined ? null : readBirthdayAudioClip(hero.birthdayAudio);
  if (hero.birthdayAudio !== undefined && !audio) throw new Error("Invalid saved birthday music");
  const media = [...moment.media] as Record<string, unknown>[];
  const seen = new Set<string>();
  for (const photo of media) {
    if (!photo || typeof photo.id !== "string" || seen.has(photo.id) || !Number.isSafeInteger(photo.position) || (photo.position as number) < 0 || photo.url !== `/api/moments/${moment.id}/edit/media/${photo.id}`) throw new Error("Invalid saved birthday photo");
    seen.add(photo.id);
  }
  media.sort((a, b) => (a.position as number) - (b.position as number));
  return {
    slug: moment.slug,
    status: moment.status as "DRAFT" | "PUBLISHED",
    draft: {
      recipientName: moment.recipientName, occasion: "BIRTHDAY", title: moment.title, theme: moment.theme as MomentDraft["theme"],
      message: text("MESSAGE", "message"), secretMessage: text("SECRET", "message"), specialDate: text("COUNTER", "date"),
      publishAt: localDateTime(moment.publishAt), birthdayStory: story, birthdayAudio: audio,
      birthdayUnlock,
    },
    photos: media.map((photo, index) => ({ id: photo.id as string, existingMediaId: photo.id as string, url: photo.url as string, caption: story.memories[index]?.caption ?? "", date: story.memories[index]?.date ?? "" })),
  };
}

export const BIRTHDAY_EDIT_TOO_LARGE = "Birthday edit photos exceed the request limit";

/** Leave room for multipart boundaries below the hosting provider's request limit. */
export function buildBirthdayEditForm(moment: object, photos: readonly { existingMediaId?: string; file?: File }[]): FormData {
  const files: File[] = [];
  const photoOrder = photos.map(photo => {
    if (photo.existingMediaId) return photo.existingMediaId;
    if (!photo.file) throw new Error("Missing birthday photo");
    files.push(photo.file);
    return `new:${files.length - 1}`;
  });
  const payload = JSON.stringify({ moment, photoOrder });
  const size = files.reduce((total, file) => total + file.size, 0) + new Blob([payload]).size + 20_000;
  if (size > 4_000_000) throw new Error(BIRTHDAY_EDIT_TOO_LARGE);
  const body = new FormData();
  body.append("payload", payload);
  files.forEach(file => body.append("files", file));
  return body;
}
