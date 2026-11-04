import assert from "node:assert/strict";
import test from "node:test";
import {
  getDayDetails,
  getCalendarYearEvents,
} from "../app/lib/khmer-calendar.ts";

const events = (year: number, month: number, day: number) =>
  getDayDetails({ year, month, day }).events;

test("popular international celebrations are present without claiming Cambodian paid leave", () => {
  for (const [month, day, id] of [
    [2, 14, "valentines-day"],
    [10, 31, "halloween"],
    [12, 24, "christmas-eve"],
    [12, 25, "christmas"],
    [12, 31, "new-years-eve"],
  ] as const) {
    const event = events(2026, month, day).find((item) => item.id === id);
    assert.ok(event, id);
    assert.equal(event.kind, "observance");
  }
});

test("Chinese lunar festivals move between years and do not repeat in leap months", () => {
  assert.ok(events(2026, 2, 16).some((e) => e.id === "chinese-new-years-eve"));
  assert.ok(events(2026, 2, 17).some((e) => e.id === "chinese-new-year"));
  assert.ok(events(2027, 2, 6).some((e) => e.id === "chinese-new-year"));
  assert.ok(events(2026, 9, 25).some((e) => e.id === "mid-autumn"));
  assert.ok(events(2027, 9, 15).some((e) => e.id === "mid-autumn"));
  assert.ok(events(2026, 6, 19).some((e) => e.id === "dragon-boat"));
  assert.ok(events(2027, 6, 9).some((e) => e.id === "dragon-boat"));
  assert.equal(
    getCalendarYearEvents(2025).filter((e) => e.id === "dragon-boat").length,
    1,
  );
});

test("Easter and family occasions use their actual movable dates", () => {
  assert.ok(events(2026, 4, 5).some((e) => e.id === "easter"));
  assert.ok(events(2027, 3, 28).some((e) => e.id === "easter"));
  assert.ok(events(2026, 5, 10).some((e) => e.id === "mothers-day"));
  assert.ok(events(2027, 5, 9).some((e) => e.id === "mothers-day"));
  assert.ok(events(2026, 6, 21).some((e) => e.id === "fathers-day"));
});

test("Muslim celebrations are labeled estimates subject to local moon sighting", () => {
  const eid = getCalendarYearEvents(2026).find((e) => e.id === "eid-al-fitr");
  assert.ok(eid);
  assert.equal(eid.kind, "observance");
  assert.equal(eid.estimated, true);
  assert.match(eid.noteEn ?? "", /moon sighting/);
});

test("annual discovery includes Cambodian festivals, religious occasions and international days", () => {
  const all = getCalendarYearEvents(2026);
  for (const id of [
    "khmer-new-year",
    "water-festival",
    "pchum-ben",
    "kan-ben",
    "meak-bochea",
    "visak-bochea",
    "buddhist-lent-start",
    "buddhist-lent-end",
    "kathin-start",
    "kathin-end",
    "national-culture",
    "world-environment",
    "teachers-day",
    "human-rights",
    "halloween",
    "christmas",
    "chinese-new-year",
  ])
    assert.ok(
      all.some((e) => e.id === id),
      id,
    );
  assert.ok(new Set(all.map((e) => e.id)).size >= 80);
  assert.equal(new Set(all.map((e) => `${e.date}:${e.id}`)).size, all.length);
  assert.ok(
    events(2028, 4, 14).some(
      (e) => e.id === "khmer-new-year" && e.kind === "observance",
    ),
  );
});

test("official holidays retain their cultural category when merging duplicate celebrations", () => {
  const visak = events(2026, 5, 1).find((event) => event.id === "visak-bochea");
  const labour = events(2026, 5, 1).find((event) => event.id === "labour-day");
  assert.equal(visak?.kind, "public-holiday");
  assert.equal(visak?.category, "buddhist");
  assert.equal(labour?.category, "international");
});

test("four-day Khmer New Year includes Lerng Sak on April 16 without inferring public leave", () => {
  const newYear = getCalendarYearEvents(2024).filter(
    (event) => event.id === "khmer-new-year",
  );
  assert.deepEqual(
    newYear.map((event) => event.date),
    ["2024-04-13", "2024-04-14", "2024-04-15", "2024-04-16"],
  );
  assert.ok(newYear.every((event) => event.kind === "observance"));
});
