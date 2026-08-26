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
  hasCompleteExpenseStoredRows,
  getNetBalance,
  getTotalIncome,
  getTotalSpent,
  normalizeExpenseStoredState,
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

test("legacy expense state without rows is detected before rendering", () => {
  assert.equal(hasCompleteExpenseStoredRows({ currency: "USD" }), false);
  assert.equal(hasCompleteExpenseStoredRows({ rows: [] }), true);
  assert.equal(hasCompleteExpenseStoredRows(null), true);

  assert.deepEqual(normalizeExpenseStoredState({ currency: "USD" }), {
    currency: "USD",
    rangeMode: "month",
    budget: { period: "monthly", amount: "" },
    raw: "",
    quickExpenseEnabled: false,
    rows: [],
  });

  assert.equal(normalizeExpenseStoredState(null), null);
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

  assert.match(source, /Total spent/);
  assert.match(source, /space-y-3 sm:hidden/);
  assert.match(source, /hidden grid-cols-4 gap-3 sm:grid/);
  assert.match(source, /grid grid-cols-1 gap-3 sm:mt-2 sm:grid-cols-2/);
  assert.match(source, /Enter your budget/);
  assert.match(source, /min-w-0/);
  assert.match(source, /truncate/);
  assert.match(source, /<MoneyAmount/);
  assert.match(source, /max-w-\[9rem\]/);
});

test("expense entry is quick-first while saved rows and summaries stay collapsed", () => {
  const header = readFileSync(
    new URL("../app/components/expense-tracker/ExpenseTrackerHeader.vue", import.meta.url),
    "utf8",
  );
  const input = readFileSync(
    new URL("../app/components/expense-tracker/ExpenseTrackerInputCard.vue", import.meta.url),
    "utf8",
  );
  const page = readFileSync(
    new URL("../app/pages/tools/expense-tracker.vue", import.meta.url),
    "utf8",
  );
  const form = readFileSync(
    new URL("../app/components/expense-tracker/QuickExpenseForm.vue", import.meta.url),
    "utf8",
  );

  assert.match(input, /<QuickExpenseForm/);
  assert.match(input, /Review and manage saved entries/);
  assert.match(input, /<details class="group mt-5 hidden/);
  assert.match(page, /Enable quick expense button/);
  assert.match(page, /View expense details/);
  assert.match(page, /View spending summary and budget/);
  assert.match(page, /<details v-if="signedIn" class="group rounded-2xl/);
  assert.match(page, /Expense saved to your account/);
  assert.match(page, /EXPENSE_SAVE_MOTIVATION/);
  assert.match(page, /@quick-add="saveQuickExpenseImmediately"/);
  assert.match(page, /canPersistFullState/);
  assert.match(page, /finishInitialStateLoad\(receivedCompleteState\)/);
  assert.match(page, /expectedRowCount: persistedRowCount\.value/);
  assert.match(page, /rows\.value = \[\.\.\.accountRows, \.\.\.savedDraft\.rows\]/);
  assert.match(page, /Keep the draft recoverable/);
  assert.match(page, /v-if="signedIn"/);
  assert.match(page, /v-else-if="isAuthReady"/);
  assert.match(header, /<header class="mb-6 hidden sm:block">/);
  assert.match(input, /mb-5 hidden items-start justify-between gap-3 sm:flex/);
  assert.match(form, /fieldset class="min-w-0 max-w-full overflow-hidden"/);
  assert.match(form, /sm:grid-cols-\[minmax\(0,1fr\)_18rem\]/);
  assert.match(form, /hidden h-16 items-center[^"]*sm:inline-flex/);
  assert.match(form, /hidden w-full max-w-full gap-2 sm:grid sm:grid-cols-6/);
  assert.match(form, /ref="categoryPicker".*sm:hidden/);
  assert.match(form, /selectMobileCategory\(item\)/);
  assert.match(form, /Custom category…/);
  assert.match(form, /Enter your category/);
  assert.match(form, /row\.customCategory = customCategory\.value\.trim\(\)/);
  assert.match(input, /min-w-0 overflow-hidden rounded-3xl/);
  assert.match(page, /min-w-0 w-full[^\"]*overflow-x-clip/);
  assert.match(form, /relative mt-2 hidden sm:block/);
  assert.match(form, /sm:hidden"\n      :disabled="props.busy"/);
  assert.match(form, /group hidden rounded-2xl/);
  assert.match(page, /hidden cursor-pointer items-center.*sm:flex/);
  assert.match(page, /mt-6 hidden space-y-3/);
  assert.doesNotMatch(header, /Share link|Reset|defineEmits/);
  assert.doesNotMatch(page, /shareLink|@share|@reset/);
});

test("quick expense floating action is opt-in, authenticated, and appends through its own endpoint", () => {
  const layout = readFileSync("app/layouts/default.vue", "utf8");
  const fab = readFileSync(
    "app/components/expense-tracker/QuickExpenseFab.vue",
    "utf8",
  );
  const controller = readFileSync("api/src/expenses/expenses.controller.ts", "utf8");
  const service = readFileSync("api/src/expenses/expenses.service.ts", "utf8");
  const saveStateDto = readFileSync(
    "api/src/expenses/dto/save-expense-state.dto.ts",
    "utf8",
  );
  const schema = readFileSync("api/prisma/schema.prisma", "utf8");
  const sql = readFileSync(
    "database/updates/2026-08-26-add-quick-expense-setting.sql",
    "utf8",
  );

  assert.match(layout, /<QuickExpenseFab v-if="visibleAuthUser && route\.path !== '\/tools\/expense-tracker'"/);
  assert.match(fab, /v-if="shouldShowTrigger"/);
  assert.match(fab, /\(\) => enabled\.value && !isOpen\.value/);
  assert.doesNotMatch(fab, /route\.path !== "\/tools\/expense-tracker"/);
  assert.match(fab, /import QuickExpenseForm from "~\/components\/expense-tracker\/QuickExpenseForm\.vue"/);
  assert.match(fab, /import \{ useAuth \} from "~\/composables\/useAuth"/);
  assert.match(fab, /Stay on track/);
  assert.match(fab, /A quick entry now keeps your money clear later\./);
  assert.match(fab, /EXPENSE_SAVE_MOTIVATION/);
  assert.match(fab, /role="dialog"/);
  assert.match(fab, /\/api\/expenses\/quick-entry/);
  assert.match(controller, /@Post\('quick-entry'\)/);
  assert.match(service, /pg_advisory_xact_lock/);
  assert.match(service, /currentRowCount !== dto\.expectedRowCount/);
  assert.match(service, /Expense entries changed; reload before saving/);
  assert.match(saveStateDto, /expectedRowCount\?: number/);
  assert.match(service, /\$executeRaw`SELECT pg_advisory_xact_lock/);
  assert.doesNotMatch(service, /\$queryRaw`SELECT pg_advisory_xact_lock/);
  assert.match(schema, /quickExpenseEnabled Boolean\s+@default\(false\)/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "quickExpenseEnabled" BOOLEAN NOT NULL DEFAULT FALSE/);
});
