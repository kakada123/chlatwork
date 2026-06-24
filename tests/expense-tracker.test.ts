import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import lzString from "lz-string";
import {
  buildExpenseBreakdown,
  buildExpenseInsights,
  buildExpenseSharePayload,
  collectExpenseItems,
  formatExpenseAmount,
  formatExpenseAmountDisplay,
  getBudgetPercent,
  getBudgetRemaining,
  getBudgetStatus,
  getExpenseDailyAverage,
  getNetBalance,
  getTotalIncome,
  getTotalSpent,
  parseExpenseSharePayload,
  parseExpenseAmount,
  parseExpenseAmountToCents,
  type ExpenseRow,
} from "../app/lib/expense-tracker.ts";

const { compressToEncodedURIComponent } = lzString;

function row(type: "expense" | "income", amount: string, category = "Food"): ExpenseRow {
  return {
    type,
    amount,
    category,
    date: "2026-06-06",
    note: "",
  };
}

test("amount parser rejects non-positive, invalid, infinite, and unsupported values", () => {
  for (const invalidAmount of [
    "",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "3.33e+28",
    "1000000000000",
  ]) {
    assert.throws(() => parseExpenseAmountToCents(invalidAmount));
  }

  assert.equal(parseExpenseAmountToCents("0.01"), 1n);
  assert.equal(parseExpenseAmount("1.005"), 1.01);
});

test("totals use decimal-safe cents instead of raw floating point addition", () => {
  const { items, error } = collectExpenseItems(
    [row("expense", "0.10"), row("expense", "0.20", "Coffee")],
    "all",
  );

  assert.equal(error, "");
  assert.equal(getTotalSpent(items), 0.3);
  assert.equal(formatExpenseAmount(getTotalSpent(items), "USD"), "$0.30");
});

test("large amounts use compact display without scientific notation", () => {
  const amount = formatExpenseAmountDisplay(3_330_000_000, "USD");

  assert.equal(amount.value, "$3.33B");
  assert.equal(amount.full, "$3,330,000,000.00");
  assert.equal(amount.isCompact, true);
  assert.doesNotMatch(amount.value, /e\+?/i);
  assert.doesNotMatch(amount.full, /e\+?/i);
});

test("zero and negative net values keep deterministic sign semantics", () => {
  assert.equal(getNetBalance(10, 10), 0);
  assert.equal(formatExpenseAmount(getNetBalance(10, 10), "USD"), "$0.00");
  assert.equal(getNetBalance(5, 10), -5);
  assert.equal(formatExpenseAmount(getNetBalance(5, 10), "USD"), "-$5.00");
});

test("budget status depends on spent versus budget, not positive net income", () => {
  const totalIncome = 1_000_000;
  const totalSpent = 120;
  const netBalance = getNetBalance(totalIncome, totalSpent);

  assert.equal(netBalance > 0, true);
  assert.equal(getBudgetRemaining(100, totalSpent), -20);
  assert.equal(getBudgetPercent(totalSpent, 100), 120);
  assert.equal(getBudgetStatus(100, totalSpent).label, "Over budget 💀");
});

test("breakdown, daily average, and insights share the same safe formatter", () => {
  const { items } = collectExpenseItems(
    [
      row("income", "3330000000", "Salary"),
      row("expense", "0.10", "Food"),
      row("expense", "0.20", "Food"),
    ],
    "all",
  );
  const totalIncome = getTotalIncome(items);
  const totalSpent = getTotalSpent(items);
  const netBalance = getNetBalance(totalIncome, totalSpent);
  const dailyAvg = getExpenseDailyAverage(items, totalSpent, 2);
  const categoryBreakdown = buildExpenseBreakdown(items, totalSpent);
  const insights = buildExpenseInsights({
    budgetRemaining: getBudgetRemaining(1, totalSpent),
    budgetValue: 1,
    categoryBreakdown,
    currency: "USD",
    dailyAvg,
    items,
    netBalance,
    topExpenses: items.filter((item) => item.type === "expense"),
    totalIncome,
    totalSpent,
  });

  assert.equal(totalIncome, 3_330_000_000);
  assert.equal(totalSpent, 0.3);
  assert.equal(dailyAvg, 0.15);
  assert.equal(categoryBreakdown[0].total, 0.3);
  assert.equal(categoryBreakdown[0].percent, 100);
  assert.equal(insights[0].text, "Income: $3.33B.");
  assert.equal(insights[0].title, "$3,330,000,000.00");
});

test("expense tracker share payload preserves rows, range, and budget", () => {
  const shareState = {
    c: "USD",
    r: "week",
    b: { period: "weekly", amount: "75" },
    t: "2026-06-24, Food, Lunch, 5.50",
    rows: [
      {
        type: "expense",
        date: "2026-06-24",
        category: "Food",
        note: "Lunch",
        amount: "5.50",
        showNote: true,
      },
    ],
  } as const;

  const payload = buildExpenseSharePayload(shareState);

  assert.deepEqual(parseExpenseSharePayload(payload), {
    c: "USD",
    r: "week",
    b: { period: "weekly", amount: "75" },
    t: "2026-06-24, Food, Lunch, 5.50",
    rows: [
      {
        type: "expense",
        date: "2026-06-24",
        category: "Food",
        note: "Lunch",
        amount: "5.50",
        showNote: true,
      },
    ],
  });

  const legacyPayload = compressToEncodedURIComponent(JSON.stringify(shareState));

  assert.deepEqual(parseExpenseSharePayload(legacyPayload), shareState);
});

test("summary markup has mobile overflow guards for extreme values", () => {
  const source = readFileSync(
    new URL("../app/components/expense-tracker/ExpenseTrackerSummaryCard.vue", import.meta.url),
    "utf8",
  );

  assert.match(source, /grid grid-cols-2 gap-3 sm:grid-cols-4/);
  assert.match(source, /min-w-0/);
  assert.match(source, /truncate/);
  assert.match(source, /<MoneyAmount/);
  assert.match(source, /max-w-\[9rem\]/);
});
