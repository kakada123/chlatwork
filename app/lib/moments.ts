import { getMomentOccasion } from "../data/moments.ts";
import {
  MOMENT_COPY,
  buildKhmerMomentTitle,
  type MomentLocale,
} from "../data/moment-locales.ts";
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
  locale: MomentLocale = "en",
) {
  if (locale === "km") return buildKhmerMomentTitle(recipientName, occasion);
  const name = recipientName.trim() || "Someone special";
  const option = getMomentOccasion(occasion);
  if (occasion === "INVITATION") return `${option.emoji} ${name}`;
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

export function getMomentCounterCopy(
  date: string,
  now = new Date(),
  locale: MomentLocale = "en",
) {
  const days = getMomentDayCount(date, now);
  if (days === null) return null;
  if (days < 0) {
    const remaining = Math.abs(days);
    return {
      value: remaining,
      unit:
        locale === "km" ? "ថ្ងៃ" : remaining === 1 ? "day" : "days",
      label:
        locale === "km" ? "រហូតដល់ថ្ងៃពិសេសរបស់យើង" : "until our special day",
    };
  }
  return {
    value: days,
    unit: locale === "km" ? "ថ្ងៃ" : days === 1 ? "day" : "days",
    label:
      locale === "km" ? "នៃអនុស្សាវរីយ៍រួមគ្នា" : "of memories together",
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
    ...(draft.occasion === "INVITATION"
      ? [
          { id: "preview-event", type: "EVENT_DETAILS" as const, position: 2, data: { date: draft.eventDate, venueName: draft.venueName, dressCode: draft.dressCode, hostName: draft.hostName } },
          { id: "preview-location", type: "LOCATION" as const, position: 3, data: { venueName: draft.venueName, address: draft.eventAddress, mapUrl: draft.mapUrl } },
          ...(draft.eventSchedule ? [{ id: "preview-schedule", type: "SCHEDULE" as const, position: 4, data: { schedule: draft.eventSchedule } }] : []),
          { id: "preview-rsvp", type: "RSVP" as const, position: 5, data: {} },
        ]
      : []),
    { id: "preview-gallery", type: "GALLERY", position: 2, data: {} },
    ...(draft.occasion !== "INVITATION" && draft.specialDate
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

export function getMomentFormError(
  draft: MomentDraft,
  photoCount: number,
  locale: MomentLocale = "en",
) {
  const errors = MOMENT_COPY[locale].creator.errors;
  if (!draft.recipientName.trim())
    return draft.occasion === "INVITATION" ? errors.eventName : errors.recipient;
  if (!draft.title.trim()) return errors.title;
  if (!draft.message.trim()) return errors.message;
  if (!draft.secretMessage.trim()) return errors.secret;
  if (photoCount < 1) return errors.photoRequired;
  if (photoCount > MAX_MOMENT_PHOTOS)
    return errors.tooManyPhotos(MAX_MOMENT_PHOTOS);
  if (draft.specialDate && !isValidMomentDate(draft.specialDate))
    return errors.invalidDate;
  if (draft.occasion === "INVITATION") {
    if (!draft.hostName.trim()) return errors.hostName;
    if (!draft.eventDate || Number.isNaN(new Date(draft.eventDate).getTime()))
      return errors.eventDate;
    if (!draft.venueName.trim()) return errors.venue;
    if (!draft.eventAddress.trim()) return errors.address;
    if (draft.mapUrl) {
      try {
        const url = new URL(draft.mapUrl);
        if (!['http:', 'https:'].includes(url.protocol)) return errors.mapUrl;
      } catch { return errors.mapUrl; }
    }
  }
  return "";
}
