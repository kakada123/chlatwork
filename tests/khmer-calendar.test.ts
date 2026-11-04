import assert from "node:assert/strict";
import test from "node:test";
import {
  getCalendarMonth,
  getDayDetails,
  getPhnomPenhToday,
  moveCalendarMonth,
  toKhmerDigits,
} from "../app/lib/khmer-calendar.ts";
import { getHolidaySchedule } from "../app/data/cambodia-holidays.ts";

test("today follows Phnom Penh midnight for visitors in any timezone", () => {
  assert.deepEqual(getPhnomPenhToday(new Date("2026-11-03T16:59:59Z")), {
    year: 2026,
    month: 11,
    day: 3,
  });
  assert.deepEqual(getPhnomPenhToday(new Date("2026-11-03T17:00:00Z")), {
    year: 2026,
    month: 11,
    day: 4,
  });
  assert.throws(() => getPhnomPenhToday(new Date("invalid")), RangeError);
});

test("rejects impossible, fractional and unsupported dates instead of normalizing them", () => {
  for (const date of [
    { year: 2026, month: 2, day: 29 },
    { year: 1900, month: 2, day: 29 },
    { year: 2026, month: 4, day: 31 },
    { year: 2026, month: 13, day: 1 },
    { year: 2026, month: 1, day: 1.5 },
    { year: 1899, month: 12, day: 31 },
    { year: 2101, month: 1, day: 1 },
    { year: NaN, month: 1, day: 1 },
  ])
    assert.throws(() => getDayDetails(date), RangeError);
  assert.equal(
    getDayDetails({ year: 2000, month: 2, day: 29 }).key,
    "2000-02-29",
  );
});

test("month grid preserves weekday placement, leap days and blank padding", () => {
  const grid = getCalendarMonth(2024, 2);
  assert.equal(grid.length, 42);
  assert.deepEqual(grid.slice(0, 4), [null, null, null, null]);
  assert.equal(grid[4]?.key, "2024-02-01");
  assert.equal(grid[32]?.key, "2024-02-29");
  assert.equal(grid.filter(Boolean).length, 29);
  assert.throws(() => getCalendarMonth(2026, 0), RangeError);
});

test("month navigation crosses years and stops at the conversion boundaries", () => {
  assert.deepEqual(moveCalendarMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(moveCalendarMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.equal(moveCalendarMonth(1900, 1, -1), null);
  assert.equal(moveCalendarMonth(2100, 12, 1), null);
  assert.throws(() => moveCalendarMonth(2026, 2, 0.5), RangeError);
});

// Independent fixture: Ministry of Economy and Finance, Preah Vihear, 29 July 2026.
// https://www.mefpvr.gov.kh/ records 15កើត ទុតិយាសាឍ មមី អដ្ឋស័ក ព.ស.2570.
test("Khmer leap-month fixture includes the second Asadha and traditional year details", () => {
  const day = getDayDetails({ year: 2026, month: 7, day: 29 });
  assert.equal(day.lunar.day, 15);
  assert.equal(day.lunar.moonPhase, 0);
  assert.equal(day.lunar.monthName, "ទុតិយាសាឍ");
  assert.equal(day.lunar.beYear, 2570);
  assert.equal(day.lunar.animalYearName, "មមី");
  assert.equal(day.lunar.sakName, "អដ្ឋស័ក");
  assert.equal(day.holyDay, true);
});

test("Visak Bochea full moon and Buddhist year transition are independent of January 1", () => {
  const fullMoon = getDayDetails({ year: 2026, month: 5, day: 1 });
  assert.equal(fullMoon.lunar.day, 15);
  assert.equal(fullMoon.lunar.moonPhase, 0);
  assert.equal(fullMoon.lunar.monthName, "ពិសាខ");
  assert.equal(fullMoon.lunar.beYear, 2569);
  assert.equal(
    getDayDetails({ year: 2026, month: 5, day: 2 }).lunar.beYear,
    2570,
  );
});

test("animal year changes with Khmer New Year rather than January 1", () => {
  assert.equal(
    getDayDetails({ year: 2026, month: 1, day: 1 }).lunar.animalYearName,
    "ម្សាញ់",
  );
  assert.equal(
    getDayDetails({ year: 2026, month: 4, day: 13 }).lunar.animalYearName,
    "ម្សាញ់",
  );
  assert.equal(
    getDayDetails({ year: 2026, month: 4, day: 17 }).lunar.animalYearName,
    "មមី",
  );
});

test("Songkran dates show the incoming animal year even when the transition is after noon", () => {
  assert.equal(
    getDayDetails({ year: 2027, month: 4, day: 13 }).lunar.animalYearName,
    "មមី",
  );
  assert.equal(
    getDayDetails({ year: 2027, month: 4, day: 14 }).lunar.animalYearName,
    "មមែ",
  );
});

test("holy days include the last day of a short waning fortnight", () => {
  // 2026-01-18 is 15 waning, 2026-02-16 is 14 waning (short month).
  const shortMonth = getDayDetails({ year: 2026, month: 2, day: 16 });
  assert.equal(shortMonth.lunar.day, 14);
  assert.equal(shortMonth.lunar.moonPhase, 1);
  assert.equal(shortMonth.holyDay, true);
  assert.equal(getDayDetails({ year: 2026, month: 2, day: 15 }).holyDay, false);
});

test("complete 2026 schedule retains both holidays on May 1 and counts unique days off", () => {
  const schedule = getHolidaySchedule(2026);
  assert.equal(schedule.verified, true);
  assert.equal(schedule.holidayDayCount, 21);
  assert.equal(schedule.events.length, 22);
  assert.deepEqual(
    schedule.events
      .filter((e) => e.date === "2026-05-01")
      .map((e) => e.id)
      .sort(),
    ["labour-day", "visak-bochea"],
  );
  assert.deepEqual(
    schedule.events.filter((e) => e.id === "water-festival").map((e) => e.date),
    ["2026-11-23", "2026-11-24", "2026-11-25"],
  );
  assert.ok(
    schedule.sources.every((source) => source.url.startsWith("https://")),
  );
});

test("2027 Pchum Ben spans two months and the official schedule has 22 days", () => {
  const schedule = getHolidaySchedule(2027);
  assert.equal(schedule.holidayDayCount, 22);
  assert.deepEqual(
    schedule.events.filter((e) => e.id === "pchum-ben").map((e) => e.date),
    ["2027-09-29", "2027-09-30", "2027-10-01"],
  );
  assert.equal(
    getDayDetails({ year: 2027, month: 10, day: 1 }).events.some(
      (e) => e.id === "pchum-ben" && e.kind === "public-holiday",
    ),
    true,
  );
});

test("unverified years never borrow official movable holidays or claim completeness", () => {
  assert.equal(getHolidaySchedule(2028).verified, false);
  assert.equal(getHolidaySchedule(2028).holidayDayCount, null);
  assert.deepEqual(getHolidaySchedule(2028).events, []);
  assert.equal(
    getDayDetails({ year: 2028, month: 1, day: 1 }).events.some(
      (e) => e.kind === "public-holiday",
    ),
    false,
  );
});

test("commemorative days have a separate category and preserve overlapping official holidays", () => {
  const day = getDayDetails({ year: 2027, month: 5, day: 20 });
  assert.ok(
    day.events.some(
      (e) => e.id === "remembrance-day" && e.kind === "observance",
    ),
  );
  assert.ok(
    day.events.some(
      (e) => e.id === "visak-bochea" && e.kind === "public-holiday",
    ),
  );
  assert.equal(toKhmerDigits(2570), "២៥៧០");
});
