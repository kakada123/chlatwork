<template>
  <div class="mx-auto w-full max-w-[1440px]">
    <ExpenseTrackerHeader
      :share-state="shareState"
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
        v-if="user"
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
      <AuthResultAuthGate v-else @login="storeGuestDraft" />
    </div>

    <p class="mt-3 text-right text-xs text-gray-500 dark:text-white/50" role="status">
      {{ persistenceMessage }}
    </p>

    <section
      class="mt-6 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-slate-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100"
      aria-label="How we validate finance examples"
    >
      <h2 class="text-base font-black">How we validate finance examples</h2>
      <p class="text-sm leading-6 text-amber-900/90 dark:text-amber-100/85">
        Expense Tracker examples are checked against the summary formulas used
        by this page. They are for planning and education, not accounting, tax,
        or legal advice.
      </p>
      <ul
        class="list-disc space-y-1 pl-5 text-sm leading-6 text-amber-900/90 dark:text-amber-100/85"
      >
        <li>
          Published examples are reviewed for total spent, budget percent, and
          remaining budget consistency.
        </li>
        <li>
          Category breakdown percentages are rechecked against raw sample
          entries.
        </li>
        <li>
          For reporting, reconcile outputs with receipts, statements, or your
          accounting records.
        </li>
        <li>
          If a sample looks wrong, send the exact case through the Contact page.
        </li>
      </ul>
      <div class="flex flex-wrap gap-3 text-sm font-semibold">
        <NuxtLink to="/editorial-policy" class="underline">
          Editorial policy
        </NuxtLink>
        <NuxtLink to="/disclaimer" class="underline">Disclaimer</NuxtLink>
        <NuxtLink to="/contact" class="underline">Contact</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {
  ExpenseCurrency,
  ExpenseRangeMode,
  ExpenseRow,
  ExpenseTrackerSharePayload,
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

const { user, isReady: isAuthReady, fetchMe } = useAuth();

type ExpenseShareState =
  | "idle"
  | "busy"
  | "copied"
  | "shared"
  | "ready"
  | "failed";

type ExpenseStoredState = {
  currency: ExpenseCurrency;
  rangeMode: ExpenseRangeMode;
  budget: { period: "monthly" | "weekly"; amount: string };
  raw: string;
  rows: ExpenseRow[];
};

useSeoMeta({
  title: "Expense Tracker | ChlatWork",
  description:
    "Track expenses with account-based PostgreSQL storage, budgets, and insights.",
  ogTitle: "Expense Tracker | ChlatWork",
  ogDescription:
    "Track expenses with account-based PostgreSQL storage, budgets, and insights.",
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
const shareState = ref<ExpenseShareState>("idle");
const persistenceState = ref<"loading" | "saved" | "saving" | "failed" | "guest">("loading");
const isHydrated = ref(false);
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const persistenceMessage = computed(() => {
  if (persistenceState.value === "loading") return "Loading your saved expenses...";
  if (persistenceState.value === "saving") return "Saving...";
  if (persistenceState.value === "failed") return "Could not save changes.";
  if (persistenceState.value === "guest") return "Sign in to save this data to your account.";
  return "Saved securely to your account.";
});

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

function clearShareTimer() {
  if (shareTimer) {
    clearTimeout(shareTimer);
    shareTimer = null;
  }
}

function setShareState(state: ExpenseShareState, ms = 0) {
  clearShareTimer();
  shareState.value = state;

  if (!ms) {
    return;
  }

  shareTimer = setTimeout(() => {
    shareState.value = "idle";
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
  getBudgetStatus(budgetValue.value, totalSpent.value),
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

watch(
  [currency, rangeMode, budget, rows, raw],
  () => {
    if (!isHydrated.value || !user.value) return;
    if (saveTimer) clearTimeout(saveTimer);
    persistenceState.value = "saving";
    saveTimer = setTimeout(() => void saveExpenseState(), 700);
  },
  { deep: true },
);

async function saveExpenseState() {
  try {
    await $fetch("/api/expenses/state", {
      method: "PUT",
      body: {
        currency: currency.value,
        rangeMode: rangeMode.value,
        budgetPeriod: budget.value.period,
        budgetAmount: budget.value.amount,
        raw: raw.value,
        rows: rows.value.map((row) => ({
          type: row.type ?? "expense",
          date: row.date ?? "",
          category: row.category ?? "",
          customCategory: row.customCategory,
          note: row.note ?? "",
          showNote: row.showNote ?? false,
          amount: row.amount ?? "",
        })),
      },
    });
    persistenceState.value = "saved";
  } catch {
    persistenceState.value = "failed";
  }
}

function storeGuestDraft() {
  sessionStorage.setItem("chlatwork-expense-login-draft", JSON.stringify({
    currency: currency.value,
    rangeMode: rangeMode.value,
    budget: budget.value,
    raw: raw.value,
    rows: rows.value,
  }));
}

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

function applyExpenseExample(exampleCurrency = currency.value) {
  const example = getExpenseExampleState();
  currency.value = exampleCurrency;
  rows.value = example.rows;
  budget.value = example.budget;
  rangeMode.value = example.rangeMode;
  raw.value = example.raw;
  rawError.value = "";
}

function isExpenseExampleState() {
  const example = getExpenseExampleState();

  return (
    rangeMode.value === example.rangeMode &&
    raw.value === example.raw &&
    JSON.stringify(budget.value) === JSON.stringify(example.budget) &&
    JSON.stringify(rows.value) === JSON.stringify(example.rows)
  );
}

function buildExampleShareUrl() {
  const query = currency.value === "KHR" ? "?example=1&c=KHR" : "?example=1";

  return `${window.location.origin}${route.path}${query}`;
}

function replaceShareQuery(query: Record<string, string | undefined>) {
  void router.replace({ query }).catch(() => {});
}

function shouldUseNativeShare() {
  if (typeof navigator.share !== "function") {
    return false;
  }

  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function copyTextWithSelection(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  try {
    textarea.focus({ preventScroll: true });
  } catch {
    textarea.focus();
  }

  textarea.select();
  textarea.setSelectionRange(0, value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

async function copyTextToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Mobile browsers can reject async clipboard writes after API/link work.
    }
  }

  return copyTextWithSelection(value);
}

async function shareUrlOnDevice(url: string): Promise<ExpenseShareState> {
  if (shouldUseNativeShare()) {
    try {
      await navigator.share({
        title: "Expense Tracker | ChlatWork",
        text: "Open this Expense Tracker share link.",
        url,
      });
      return "shared";
    } catch (error) {
      if (isAbortError(error)) {
        return "idle";
      }
    }
  }

  return (await copyTextToClipboard(url)) ? "copied" : "ready";
}

function showShareResult(state: ExpenseShareState) {
  if (state === "ready") {
    setShareState("ready");
    return;
  }

  setShareState(state, state === "idle" ? 0 : 1500);
}

async function shareLink() {
  if (shareState.value === "busy") {
    return;
  }

  setShareState("busy");

  if (isExpenseExampleState()) {
    const query =
      currency.value === "KHR" ? { example: "1", c: "KHR" } : { example: "1" };
    const url = buildExampleShareUrl();

    replaceShareQuery(query);
    showShareResult(await shareUrlOnDevice(url));
    return;
  }

  const s = buildExpenseSharePayload({
    c: currency.value,
    r: rangeMode.value,
    b: budget.value,
    t: raw.value,
    rows: rows.value,
  });

  replaceShareQuery({ s });
  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  showShareResult(await shareUrlOnDevice(url));
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

  if (await copyTextToClipboard(lines.join("\n"))) {
    flashCopied();
  }
}

function loadExample() {
  applyExpenseExample();
}

function reset() {
  rawError.value = "";
  raw.value = "";
  budget.value = createDefaultBudget();
  rangeMode.value = "month";
  rows.value = createDefaultExpenseRows();
}

function applyExpenseSharePayload(payload: ExpenseTrackerSharePayload) {
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
}

onMounted(async () => {
  if (!isAuthReady.value) await fetchMe();

  if (user.value && !route.query.example && !route.query.s) {
    const draft = sessionStorage.getItem("chlatwork-expense-login-draft");
    if (draft) {
      try {
        const saved = JSON.parse(draft) as ExpenseStoredState;
        currency.value = saved.currency;
        rangeMode.value = saved.rangeMode;
        budget.value = saved.budget;
        raw.value = saved.raw;
        rows.value = saved.rows;
        sessionStorage.removeItem("chlatwork-expense-login-draft");
        persistenceState.value = "saving";
        isHydrated.value = true;
        await saveExpenseState();
        return;
      } catch {
        sessionStorage.removeItem("chlatwork-expense-login-draft");
      }
    }
  }

  if (route.query.example === "1") {
    applyExpenseExample(route.query.c === "KHR" ? "KHR" : "USD");
    persistenceState.value = user.value ? "saved" : "guest";
    isHydrated.value = true;
    return;
  }

  const s = route.query.s;
  if (typeof s === "string" && s.trim()) {
    try {
      applyExpenseSharePayload(parseExpenseSharePayload(s.trim()));
    } catch {
      // Ignore malformed links; they must never overwrite stored account data.
    }
    persistenceState.value = user.value ? "saved" : "guest";
    isHydrated.value = true;
    return;
  }

  if (!user.value) {
    persistenceState.value = "guest";
    isHydrated.value = true;
    return;
  }

  try {
    const saved = await $fetch<ExpenseStoredState | null>("/api/expenses/state");
    if (saved) {
      currency.value = saved.currency;
      rangeMode.value = saved.rangeMode;
      budget.value = saved.budget;
      raw.value = saved.raw;
      rows.value = saved.rows.length ? saved.rows : createDefaultExpenseRows();
    }
    persistenceState.value = "saved";
  } catch {
    persistenceState.value = "failed";
  } finally {
    isHydrated.value = true;
  }
});

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (shareTimer) {
    clearShareTimer();
  }

  if (saveTimer) clearTimeout(saveTimer);
});
</script>
