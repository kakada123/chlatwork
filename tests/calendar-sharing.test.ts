import assert from "node:assert/strict";
import test from "node:test";
import {
  calendarDetailPath,
  calendarMonthPath,
  getCalendarDetail,
  getCalendarDetailMeta,
  parseCalendarDate,
  shareCalendarLink,
} from "../app/lib/calendar-sharing.ts";

test("public dates reject impossible, ambiguous, and unsupported values", () => {
  for (const value of [
    undefined,
    [],
    ["2026-11-09"],
    "2026-2-01",
    "2026-02-29",
    "2026-04-31",
    "1899-12-31",
    "2101-01-01",
    "2026-11-09junk",
  ])
    assert.equal(parseCalendarDate(value), null);
  assert.deepEqual(parseCalendarDate("2028-02-29"), {
    year: 2028,
    month: 2,
    day: 29,
  });
  assert.ok(parseCalendarDate("1900-01-01"));
  assert.ok(parseCalendarDate("2100-12-31"));
});

test("event links resolve only events belonging to that date", () => {
  const holiday = getCalendarDetail("2026-11-09", "independence-day");
  assert.equal(holiday?.event?.kind, "public-holiday");
  assert.equal(getCalendarDetail("2026-11-10", "independence-day"), null);
  for (const event of [[], ["independence-day"], "", "unknown", "<script>"])
    assert.equal(getCalendarDetail("2026-11-09", event), null);
  assert.equal(getCalendarDetail("2026-11-09")?.event, null);
});

test("overlapping occasions have different links and retain language", () => {
  const date = { year: 2026, month: 5, day: 1 };
  const first = calendarDetailPath(date, "labour-day", false);
  const second = calendarDetailPath(date, "visak-bochea", false);
  assert.equal(
    first,
    "/tools/khmer-calendar/date/2026-05-01?event=labour-day&lang=en",
  );
  assert.notEqual(first, second);
  assert.ok(getCalendarDetail("2026-05-01", "visak-bochea"));
  assert.equal(
    calendarDetailPath(date),
    "/tools/khmer-calendar/date/2026-05-01",
  );
  assert.equal(
    calendarMonthPath(date, false),
    "/tools/khmer-calendar?date=2026-05-01&lang=en",
  );
  assert.throws(() => calendarDetailPath(date, "christmas"), RangeError);
});

test("date and event metadata describe the exact selected occurrence", () => {
  const detail = getCalendarDetail("2026-11-09", "independence-day")!;
  const event = getCalendarDetailMeta(detail.day, detail.event, false);
  assert.match(event.title, /National Independence Day/);
  assert.match(event.title, /9 November 2026/);
  assert.match(event.description, /public holiday/i);
  const date = getCalendarDetailMeta(detail.day, null, true);
  assert.match(date.title, /៩ វិច្ឆិកា ២០២៦/);
  assert.match(date.description, /ឯករាជ្យ/);
});

test("native sharing succeeds without copying and cancellation is silent", async () => {
  const data = {
    title: "Holiday",
    url: "https://chlatwork.com/tools/khmer-calendar/date/2026-11-09",
  };
  let copied = false;
  assert.equal(
    await shareCalendarLink(data, {
      share: async (received) => {
        assert.deepEqual(received, data);
      },
      clipboard: {
        writeText: async () => {
          copied = true;
        },
      },
    }),
    "shared",
  );
  assert.equal(copied, false);
  assert.equal(
    await shareCalendarLink(data, {
      share: async () => {
        throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
      },
      clipboard: {
        writeText: async () => {
          copied = true;
        },
      },
    }),
    "cancelled",
  );
  assert.equal(copied, false);
});

test("unavailable native sharing copies the exact URL or exposes fallback state", async () => {
  const data = {
    title: "Holiday",
    url: "https://chlatwork.com/tools/khmer-calendar/date/2026-11-09?event=independence-day",
  };
  let copied = "";
  assert.equal(
    await shareCalendarLink(data, {
      share: async () => {
        throw new Error("Denied");
      },
      clipboard: {
        writeText: async (value) => {
          copied = value;
        },
      },
    }),
    "copied",
  );
  assert.equal(copied, data.url);
  assert.equal(
    await shareCalendarLink(data, {
      clipboard: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    }),
    "unavailable",
  );
  assert.equal(await shareCalendarLink(data, {}), "unavailable");
});
