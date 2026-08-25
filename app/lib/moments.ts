import { getMomentOccasion } from "../data/moments.ts";
import type {
  MomentBlock,
  MomentDraft,
  MomentMedia,
  ReadyMoment,
} from "../types/moment.ts";

export const MAX_MOMENT_PHOTOS = 10;
export const MAX_MOMENT_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_MOMENT_UPLOAD_BYTES = 2 * 1024 * 1024;

export function buildMomentTitle(
  recipientName: string,
  occasion: MomentDraft["occasion"],
) {
  const name = recipientName.trim() || "Someone special";
  const option = getMomentOccasion(occasion);
  if (option.titlePrefix === "For") return `${option.emoji} For ${name}`;
  if (option.titlePrefix === "For my friend") {
    return `${option.emoji} For my friend ${name}!`;
  }
  return `${option.emoji} ${option.titlePrefix}, ${name}!`;
}

export function isValidMomentDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function getMomentDayCount(date: string, now = new Date()) {
  if (!isValidMomentDate(date)) return null;
  const start = new Date(`${date}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000);
}

export function getMomentCounterCopy(date: string, now = new Date()) {
  const days = getMomentDayCount(date, now);
  if (days === null) return null;
  if (days < 0) {
    const remaining = Math.abs(days);
    return {
      value: remaining,
      unit: remaining === 1 ? "day" : "days",
      label: "until our special day",
    };
  }
  return {
    value: days,
    unit: days === 1 ? "day" : "days",
    label: "of memories together",
  };
}

export function readMomentBlockText(
  block: MomentBlock | undefined,
  key: string,
) {
  const value = block?.data[key];
  return typeof value === "string" ? value : "";
}

export function buildPreviewMoment(
  draft: MomentDraft,
  photoUrls: string[],
): ReadyMoment {
  const blocks: MomentBlock[] = [
    {
      id: "preview-hero",
      type: "HERO",
      position: 0,
      data: { title: draft.title },
    },
    {
      id: "preview-message",
      type: "MESSAGE",
      position: 1,
      data: { message: draft.message },
    },
    { id: "preview-gallery", type: "GALLERY", position: 2, data: {} },
    ...(draft.specialDate
      ? [
          {
            id: "preview-counter",
            type: "COUNTER" as const,
            position: 3,
            data: { date: draft.specialDate },
          },
        ]
      : []),
    {
      id: "preview-secret",
      type: "SECRET",
      position: 4,
      data: { message: draft.secretMessage },
    },
  ];
  const media: MomentMedia[] = photoUrls.map((url, position) => ({
    id: `preview-photo-${position}`,
    position,
    url,
  }));
  return {
    status: "ready",
    slug: "preview",
    recipientName: draft.recipientName,
    occasion: draft.occasion,
    title: draft.title,
    theme: draft.theme,
    blocks,
    media,
  };
}

export function getMomentFormError(draft: MomentDraft, photoCount: number) {
  if (!draft.recipientName.trim()) return "Tell us who this Moment is for.";
  if (!draft.title.trim()) return "Add a title for the Moment.";
  if (!draft.message.trim()) return "Write a message for your person.";
  if (!draft.secretMessage.trim()) return "Add the secret surprise message.";
  if (photoCount < 1) return "Add at least one photo.";
  if (photoCount > MAX_MOMENT_PHOTOS)
    return `Add no more than ${MAX_MOMENT_PHOTOS} photos.`;
  if (draft.specialDate && !isValidMomentDate(draft.specialDate))
    return "Choose a valid special date.";
  return "";
}
