import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExpenseTrendSeries,
  buildWeeklyExpenseBreakdown,
  formatExpenseDayDDMMYYYY,
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

test("weekly expense breakdown groups days day-by-day and sums weekly totals", () => {
  const data = [
    { date: "2026-11-01", spent: 15, income: 0 },
    { date: "2026-11-02", spent: 34, income: 0 },
    { date: "2026-11-10", spent: 25.5, income: 10 },
  ];

  const weeks = buildWeeklyExpenseBreakdown(data);
  assert.equal(weeks.length, 2);

  // Week 1: 2026-11-01 (Sun) to 2026-11-07 (Sat)
  assert.equal(weeks[0].weekStart, "2026-11-01");
  assert.equal(weeks[0].weekEnd, "2026-11-07");
  assert.equal(weeks[0].formattedRange, "01-11-2026 – 07-11-2026");
  assert.equal(weeks[0].activeRangeLabel, "01-11-2026 – 02-11-2026");
  assert.equal(weeks[0].totalSpent, 49);
  assert.equal(weeks[0].days.length, 2);
  assert.deepEqual(weeks[0].days[0], {
    date: "2026-11-01",
    formattedDate: "01-11-2026",
    dayOfWeek: "Sun",
    spent: 15,
    income: 0,
  });
  assert.deepEqual(weeks[0].days[1], {
    date: "2026-11-02",
    formattedDate: "02-11-2026",
    dayOfWeek: "Mon",
    spent: 34,
    income: 0,
  });

  // Week 2: 2026-11-08 (Sun) to 2026-11-14 (Sat)
  assert.equal(weeks[1].weekStart, "2026-11-08");
  assert.equal(weeks[1].weekEnd, "2026-11-14");
  assert.equal(weeks[1].activeRangeLabel, "10-11-2026");
  assert.equal(weeks[1].totalSpent, 25.5);
  assert.equal(weeks[1].totalIncome, 10);
});

test("weekly expense breakdown ignores dates with zero spent and zero income", () => {
  const data = [
    { date: "2026-11-01", spent: 0, income: 0 },
    { date: "2026-11-02", spent: 0, income: 0 },
  ];
  const weeks = buildWeeklyExpenseBreakdown(data);
  assert.deepEqual(weeks, []);
});

test("formatExpenseDayDDMMYYYY converts ISO YYYY-MM-DD to DD-MM-YYYY", () => {
  assert.equal(formatExpenseDayDDMMYYYY("2026-11-01"), "01-11-2026");
  assert.equal(formatExpenseDayDDMMYYYY("2026-11-30"), "30-11-2026");
  assert.equal(formatExpenseDayDDMMYYYY("invalid"), "invalid");
});
