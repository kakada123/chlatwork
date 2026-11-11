import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpenseTrendSeries,
  getExpensePresetRange,
} from "../app/lib/expense-dashboard-view.ts";

test("period shortcuts use local calendar boundaries", () => {
  const now = new Date(2026, 9, 21);
  assert.deepEqual(getExpensePresetRange("today", now), {
    from: "2026-10-21",
    to: "2026-10-21",
  });
  assert.deepEqual(getExpensePresetRange("week", now), {
    from: "2026-10-15",
    to: "2026-10-21",
  });
  assert.deepEqual(getExpensePresetRange("month", now), {
    from: "2026-10-01",
    to: "2026-10-31",
  });
  assert.deepEqual(getExpensePresetRange("last-month", new Date(2026, 0, 8)), {
    from: "2025-12-01",
    to: "2025-12-31",
  });
  assert.deepEqual(getExpensePresetRange("year", now), {
    from: "2026-01-01",
    to: "2026-12-31",
  });
});

test("daily trends fill missing dates with zero without changing totals", () => {
  const series = buildExpenseTrendSeries(
    [{ date: "2026-10-02", spent: 0.3, income: 50 }],
    "2026-10-01",
    "2026-10-03",
    "daily",
  );
  assert.equal(series.tooManyPoints, false);
  assert.deepEqual(series.points, [
    { date: "2026-10-01", spent: 0, income: 0 },
    { date: "2026-10-02", spent: 0.3, income: 50 },
    { date: "2026-10-03", spent: 0, income: 0 },
  ]);
});

test("weekly and monthly views sum money without floating-point drift", () => {
  const data = [
    { date: "2026-10-01", spent: 0.1, income: 0 },
    { date: "2026-10-02", spent: 0.2, income: 20 },
    { date: "2026-11-01", spent: 5, income: 0 },
  ];
  assert.deepEqual(
    buildExpenseTrendSeries(data, "2026-10-01", "2026-10-04", "weekly").points,
    [{ date: "2026-09-28", spent: 0.3, income: 20 }],
  );
  assert.deepEqual(
    buildExpenseTrendSeries(data, "2026-10-01", "2026-11-30", "monthly").points,
    [
      { date: "2026-10-01", spent: 0.3, income: 20 },
      { date: "2026-11-01", spent: 5, income: 0 },
    ],
  );
});

test("very long daily ranges are bounded so the chart cannot freeze the page", () => {
  const series = buildExpenseTrendSeries(
    [],
    "1900-01-01",
    "2100-12-31",
    "daily",
  );
  assert.equal(series.tooManyPoints, true);
  assert.deepEqual(series.points, []);
});
