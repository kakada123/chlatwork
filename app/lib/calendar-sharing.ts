import {
  calendarDateKey,
  ENGLISH_MONTHS,
  getDayDetails,
  KHMER_MONTHS,
  KHMER_WEEKDAYS,
  toKhmerDigits,
  type CalendarDate,
  type CalendarDay,
} from "./khmer-calendar.ts";
import type { CalendarEvent } from "../data/cambodia-holidays.ts";

export function parseCalendarDate(value: unknown): CalendarDate | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = { year: year!, month: month!, day: day! };
  try {
    calendarDateKey(date);
    return date;
  } catch {
    return null;
  }
}

export function getCalendarDetail(dateKey: unknown, eventId?: unknown) {
  const date = parseCalendarDate(dateKey);
  if (!date || (eventId !== undefined && typeof eventId !== "string"))
    return null;
  const day = getDayDetails(date);
  const event =
    eventId === undefined
      ? null
      : day.events.find((item) => item.id === eventId);
  // An event link identifies this occurrence, even when several occasions share the date.
  if (eventId !== undefined && !event) return null;
  return { day, event: event ?? null };
}

export function calendarDetailPath(
  date: CalendarDate,
  eventId?: string,
  khmer = true,
) {
  const key = calendarDateKey(date);
  if (!getCalendarDetail(key, eventId))
    throw new RangeError("Event does not occur on this date.");
  const query = new URLSearchParams();
  if (eventId) query.set("event", eventId);
  if (!khmer) query.set("lang", "en");
  return `/tools/khmer-calendar/date/${key}${query.size ? `?${query}` : ""}`;
}

export function calendarMonthPath(date: CalendarDate, khmer = true) {
  const query = new URLSearchParams({ date: calendarDateKey(date) });
  if (!khmer) query.set("lang", "en");
  return `/tools/khmer-calendar?${query}`;
}

export function calendarDateLabel(day: CalendarDay, khmer: boolean) {
  const { year, month, day: date } = day.date;
  return khmer
    ? `${KHMER_WEEKDAYS[day.weekday]} ${toKhmerDigits(date)} ${KHMER_MONTHS[month - 1]} ${toKhmerDigits(year)}`
    : `${date} ${ENGLISH_MONTHS[month - 1]} ${year}`;
}

export function getCalendarDetailMeta(
  day: CalendarDay,
  event: CalendarEvent | null,
  khmer: boolean,
) {
  const date = calendarDateLabel(day, khmer);
  const name = event
    ? khmer
      ? event.nameKm
      : event.nameEn
    : khmer
      ? "ប្រតិទិនខ្មែរ"
      : "Khmer Calendar";
  const occasions = (event ? [event] : day.events)
    .map((item) => (khmer ? item.nameKm : item.nameEn))
    .join(" · ");
  const kind =
    event?.kind === "public-holiday"
      ? khmer
        ? "ថ្ងៃឈប់សម្រាកផ្លូវការ"
        : "Cambodian public holiday"
      : khmer
        ? "ចន្ទគតិខ្មែរ និងពិធីបុណ្យ"
        : "Khmer lunar date, celebrations and observances";
  return {
    title: `${name} · ${date} | ChlatWork`,
    description: `${date} · ${kind}${occasions ? ` · ${occasions}` : ""}${event?.estimated ? (khmer ? " · ប៉ាន់ស្មាន" : " · Estimated date") : ""}`,
  };
}

type ShareBrowser = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export async function shareCalendarLink(
  data: { title: string; url: string },
  browser: ShareBrowser,
) {
  if (browser.share) {
    try {
      await browser.share(data);
      return "shared" as const;
    } catch (error) {
      // Dismissing the share sheet is deliberate; do not copy or show an error afterwards.
      if ((error as { name?: string })?.name === "AbortError")
        return "cancelled" as const;
    }
  }
  try {
    if (!browser.clipboard) return "unavailable" as const;
    await browser.clipboard.writeText(data.url);
    return "copied" as const;
  } catch {
    // Embedded browsers may deny clipboard access; the control then exposes a selectable link.
    return "unavailable" as const;
  }
}
