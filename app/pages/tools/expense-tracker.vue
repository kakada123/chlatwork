<template>
  <div class="mx-auto max-w-5xl">
    <ExpenseTrackerHeader
      :share-copied="shareCopied"
      @reset="reset"
      @share="shareLink"
    />

    <div class="grid grid-cols-1 gap-4">
      <ExpenseTrackerInputCard
        v-model:currency="currency"
        v-model:range-mode="rangeMode"
        v-model:rows="rows"
        v-model:raw="raw"
        :copied="copied"
        :can-copy="filteredExpenses.length > 0"
        :error="error"
        @apply-raw="applyRaw"
        @copy-summary="copySummary"
        @load-example="loadExample"
      />

      <ExpenseTrackerSummaryCard
        v-model:budget="budget"
        :currency="currency"
        :range-label="rangeLabel"
        :items-count="filteredExpenses.length"
        :total-income="totalIncome"
        :total-spent="totalSpent"
        :net-balance="netBalance"
        :daily-avg="dailyAvg"
        :budget-value="budgetValue"
        :budget-remaining="budgetRemaining"
        :budget-percent="budgetPercent"
        :budget-status="budgetStatus"
        :insights="insights"
        :category-breakdown="categoryBreakdown"
        :top-expenses="topExpenses"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ExpenseCurrency,
  ExpenseRangeMode,
  ExpenseRow,
} from "~/lib/expense-tracker";
import {
  buildExpenseBreakdown,
  buildExpenseSharePayload,
  buildExpenseSummaryLines,
  buildExpenseInsights,
  collectExpenseItems,
  createDefaultBudget,
  createDefaultExpenseRows,
  getBudgetPercent,
  getBudgetRemaining,
  getBudgetStatus,
  getBudgetValue,
  getExpenseDailyAverage,
  getExpenseDateSpanDays,
  getExpenseExampleState,
  getExpenseRangeLabel,
  getNetBalance,
  getTopExpenseItems,
  getTotalIncome,
  getTotalSpent,
  parseExpenseRaw,
  parseExpenseSharePayload,
} from "~/lib/expense-tracker";

const route = useRoute();
const router = useRouter();

useSeoMeta({
  title: "Expense Tracker | ChlatWork",
  description:
    "Track your expenses with budget and insights. Simple, fast, no signup.",
  ogTitle: "Expense Tracker | ChlatWork",
  ogDescription:
    "Track your expenses with budget and insights. Simple, fast, no signup.",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterTitle: "Expense Tracker | ChlatWork",
  twitterDescription: "Track your expenses with budget and insights.",
});

useHead({
  link: [
    { rel: "canonical", href: "https://chlatwork.com/tools/expense-tracker" },
  ],
});

const copied = ref(false);
const shareCopied = ref(false);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let shareTimer: ReturnType<typeof setTimeout> | null = null;

const currency = ref<ExpenseCurrency>("USD");
const rangeMode = ref<ExpenseRangeMode>("month");
const budget = ref(createDefaultBudget());
const rows = ref<ExpenseRow[]>(createDefaultExpenseRows());
const raw = ref("");
const rawError = ref("");

function flashCopied(ms = 1500) {
  copied.value = true;
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  copiedTimer = setTimeout(() => {
    copied.value = false;
    copiedTimer = null;
  }, ms);
}

function flashShareCopied(ms = 1500) {
  shareCopied.value = true;
  if (shareTimer) {
    clearTimeout(shareTimer);
  }

  shareTimer = setTimeout(() => {
    shareCopied.value = false;
    shareTimer = null;
  }, ms);
}

const parsedRowsState = computed(() =>
  collectExpenseItems(rows.value, rangeMode.value),
);

const filteredExpenses = computed(() => parsedRowsState.value.items);
const error = computed(() => rawError.value || parsedRowsState.value.error);
const rangeLabel = computed(() => getExpenseRangeLabel(rangeMode.value));
const totalSpent = computed(() => getTotalSpent(filteredExpenses.value));
const totalIncome = computed(() => getTotalIncome(filteredExpenses.value));
const netBalance = computed(() =>
  getNetBalance(totalIncome.value, totalSpent.value),
);
const dateSpanDays = computed(() =>
  getExpenseDateSpanDays(filteredExpenses.value),
);
const dailyAvg = computed(() =>
  getExpenseDailyAverage(
    filteredExpenses.value,
    totalSpent.value,
    dateSpanDays.value,
  ),
);
const budgetValue = computed(() => getBudgetValue(budget.value));
const budgetRemaining = computed(() =>
  getBudgetRemaining(budgetValue.value, totalSpent.value),
);
const budgetPercent = computed(() =>
  getBudgetPercent(totalSpent.value, budgetValue.value),
);
const budgetStatus = computed(() =>
  getBudgetStatus(budgetValue.value, budgetRemaining.value),
);
const categoryBreakdown = computed(() =>
  buildExpenseBreakdown(filteredExpenses.value, totalSpent.value),
);
const topExpenses = computed(() => getTopExpenseItems(filteredExpenses.value));
const insights = computed(() =>
  buildExpenseInsights({
    currency: currency.value,
    items: filteredExpenses.value,
    totalIncome: totalIncome.value,
    totalSpent: totalSpent.value,
    netBalance: netBalance.value,
    categoryBreakdown: categoryBreakdown.value,
    topExpenses: topExpenses.value,
    budgetValue: budgetValue.value,
    budgetRemaining: budgetRemaining.value,
    dailyAvg: dailyAvg.value,
  }),
);

watch(
  rows,
  () => {
    if (rawError.value) {
      rawError.value = "";
    }
  },
  { deep: true },
);

function applyRaw() {
  rawError.value = "";
  if (!raw.value.trim()) {
    return;
  }

  try {
    const nextRows = parseExpenseRaw(raw.value);
    rows.value = nextRows.length ? nextRows : createDefaultExpenseRows();
  } catch (error: any) {
    rawError.value = error?.message || "Invalid paste input";
  }
}

async function shareLink() {
  const s = buildExpenseSharePayload({
    c: currency.value,
    r: rangeMode.value,
    b: budget.value,
    t: raw.value,
    rows: rows.value,
  });

  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  flashShareCopied();
}

async function copySummary() {
  if (!filteredExpenses.value.length) {
    return;
  }

  const lines = buildExpenseSummaryLines({
    currency: currency.value,
    rangeLabel: rangeLabel.value,
    itemsCount: filteredExpenses.value.length,
    totalIncome: totalIncome.value,
    totalSpent: totalSpent.value,
    netBalance: netBalance.value,
    dailyAvg: dailyAvg.value,
    budget: budget.value,
    budgetValue: budgetValue.value,
    budgetRemaining: budgetRemaining.value,
    budgetPercent: budgetPercent.value,
    categoryBreakdown: categoryBreakdown.value,
  });

  await navigator.clipboard.writeText(lines.join("\n"));
  flashCopied();
}

function loadExample() {
  const example = getExpenseExampleState();
  rows.value = example.rows;
  budget.value = example.budget;
  rangeMode.value = example.rangeMode;
  raw.value = example.raw;
  rawError.value = "";
}

function reset() {
  rawError.value = "";
  raw.value = "";
  budget.value = createDefaultBudget();
  rangeMode.value = "month";
  rows.value = createDefaultExpenseRows();
}

onMounted(() => {
  const s = route.query.s;
  if (typeof s !== "string" || !s.trim()) {
    return;
  }

  try {
    const payload = parseExpenseSharePayload(s.trim());

    if (payload.c) {
      currency.value = payload.c;
    }

    if (payload.r) {
      rangeMode.value = payload.r;
    }

    if (payload.b) {
      budget.value = payload.b;
    }

    if (typeof payload.t === "string") {
      raw.value = payload.t;
    }

    if (Array.isArray(payload.rows)) {
      rows.value = payload.rows as ExpenseRow[];
    }
  } catch {
    // ignore invalid payload
  }
});

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (shareTimer) {
    clearTimeout(shareTimer);
  }
});
</script>
