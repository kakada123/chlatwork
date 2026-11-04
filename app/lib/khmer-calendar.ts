import { fromGregorian, type KhmerDateInfo } from "./vendor/momentkh.js";
import {
  getHolidaySchedule,
  type CalendarEvent,
} from "../data/cambodia-holidays.ts";
import { getCelebrations } from "../data/calendar-celebrations.ts";

export type CalendarDate = { year: number; month: number; day: number };
export type CalendarDay = {
  date: CalendarDate;
  key: string;
  weekday: number;
  lunar: KhmerDateInfo;
  holyDay: boolean;
  events: CalendarEvent[];
};

export const MIN_CALENDAR_YEAR = 1900;
export const MAX_CALENDAR_YEAR = 2100;
export const KHMER_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];
export const KHMER_WEEKDAYS = [
  "អាទិត្យ",
  "ចន្ទ",
  "អង្គារ",
  "ពុធ",
  "ព្រហស្បតិ៍",
  "សុក្រ",
  "សៅរ៍",
];
export const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function validateDate(date: CalendarDate) {
  const { year, month, day } = date;
  if (
    ![year, month, day].every(Number.isInteger) ||
    year < MIN_CALENDAR_YEAR ||
    year > MAX_CALENDAR_YEAR ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > new Date(Date.UTC(year, month, 0)).getUTCDate()
  )
    throw new RangeError(
      "Invalid calendar date; supported years are 1900–2100.",
    );
}

export function calendarDateKey(date: CalendarDate): string {
  validateDate(date);
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function toKhmerDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => "០១២៣៤៥៦៧៨៩"[Number(digit)]!);
}

export function getPhnomPenhToday(now = new Date()): CalendarDate {
  if (!Number.isFinite(now.getTime()))
    throw new RangeError("Invalid current date.");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((item) => item.type === type)?.value);
  const result = { year: part("year"), month: part("month"), day: part("day") };
  validateDate(result);
  return result;
}

export function moveCalendarMonth(year: number, month: number, offset: number) {
  validateDate({ year, month, day: 1 });
  if (!Number.isInteger(offset))
    throw new RangeError("Month offset must be an integer.");
  const total = year * 12 + month - 1 + offset;
  const nextYear = Math.floor(total / 12);
  if (nextYear < MIN_CALENDAR_YEAR || nextYear > MAX_CALENDAR_YEAR) return null;
  return { year: nextYear, month: (total % 12) + 1 };
}

function buildDay(
  date: CalendarDate,
  publicHolidays: CalendarEvent[],
): CalendarDay {
  const key = calendarDateKey(date);
  // This is a day calendar: the Songkran date carries the incoming animal year,
  // even when its exact transition is after noon. Numeric fields avoid UTC parsing shifts.
  const lunar = fromGregorian(
    date.year,
    date.month,
    date.day,
    23,
    59,
    59,
  ).khmer;
  const tomorrow = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  const nextLunar = fromGregorian(
    tomorrow.getUTCFullYear(),
    tomorrow.getUTCMonth() + 1,
    tomorrow.getUTCDate(),
    12,
  ).khmer;
  // The final waning day can be 14 or 15; testing the next phase handles short lunar months.
  const holyDay =
    lunar.day === 8 ||
    (lunar.moonPhase === 0 && lunar.day === 15) ||
    (lunar.moonPhase === 1 && nextLunar.day === 1 && nextLunar.moonPhase === 0);
  const celebrations = getCelebrations(date, lunar);
  const events = [
    ...publicHolidays
      .filter((event) => event.date === key)
      .map((holiday) => ({
        ...celebrations.find((celebration) => celebration.id === holiday.id),
        ...holiday,
      })),
    ...celebrations.filter(
      (event) =>
        !publicHolidays.some(
          (holiday) => holiday.date === key && holiday.id === event.id,
        ),
    ),
  ];
  return {
    date: { ...date },
    key,
    weekday: lunar.dayOfWeek,
    lunar,
    holyDay,
    events,
  };
}

export function getDayDetails(date: CalendarDate): CalendarDay {
  validateDate(date);
  return buildDay(date, getHolidaySchedule(date.year).events);
}

export function getCalendarMonth(
  year: number,
  month: number,
): (CalendarDay | null)[] {
  validateDate({ year, month, day: 1 });
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const holidays = getHolidaySchedule(year).events;
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day >= 1 && day <= count
      ? buildDay({ year, month, day }, holidays)
      : null;
  });
}

export function getCalendarYearEvents(year: number): CalendarEvent[] {
  validateDate({ year, month: 1, day: 1 });
  return Array.from({ length: 12 }, (_, index) =>
    getCalendarMonth(year, index + 1),
  )
    .flat()
    .filter((day) => day !== null)
    .flatMap((day) => day.events);
}
