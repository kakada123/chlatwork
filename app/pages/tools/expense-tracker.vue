<template>
  <div class="mx-auto min-w-0 w-full max-w-[1440px] overflow-x-clip">
    <ExpenseTrackerHeader />

    <div class="grid grid-cols-1 gap-4">
      <ExpenseTrackerInputCard
        v-model:currency="currency"
        v-model:range-mode="rangeMode"
        v-model:rows="rows"
        v-model:raw="raw"
        :copied="copied"
        :can-copy="filteredExpenses.length > 0"
        :error="error"
        :signed-in="signedIn"
        @apply-raw="applyRaw"
        @copy-summary="copySummary"
        @load-example="loadExample"
        @quick-add="saveQuickExpenseImmediately"
      />

      <label
        v-if="signedIn"
        class="hidden cursor-pointer items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-cyan-300/20 dark:bg-cyan-300/[0.06] sm:flex"
      >
        <span>
          <span class="block text-sm font-black text-slate-950 dark:text-white">Enable quick expense button</span>
          <span class="mt-1 block text-xs leading-5 text-slate-600 dark:text-white/55">Show a floating Add expense button on ChlatWork while you are signed in.</span>
        </span>
        <span class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition" :class="quickExpenseEnabled ? 'bg-sky-600 dark:bg-cyan-200' : 'bg-slate-300 dark:bg-white/20'">
          <input v-model="quickExpenseEnabled" type="checkbox" class="peer sr-only" @change="saveImmediately" />
          <span class="ml-1 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 dark:peer-checked:bg-slate-950" aria-hidden="true" />
        </span>
      </label>

      <details v-if="signedIn" class="group rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#101214]">
        <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-sm font-black text-slate-700 dark:text-white/75">
          <span class="sm:hidden">View expense details</span>
          <span class="hidden sm:inline">View spending summary and budget</span>
          <svg class="h-4 w-4 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div class="border-t border-slate-200 p-3 dark:border-white/10 sm:p-4">
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
      </details>
      <AuthResultAuthGate v-else-if="isAuthReady" @login="storeGuestDraft" />
    </div>

    <p class="mt-3 hidden text-right text-xs text-gray-500 dark:text-white/50 sm:block" role="status">
      {{ persistenceMessage }}
    </p>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="quickSaveNotice"
        role="status"
        class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[115] inline-flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-2xl sm:right-6 sm:max-w-sm"
      >
        <svg class="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
        <span>
          <span class="block">Expense saved to your account</span>
          <span class="mt-1 block text-xs font-medium leading-5 text-white/80">
            {{ EXPENSE_SAVE_MOTIVATION }}
          </span>
        </span>
      </div>
    </Transition>

    <section
      class="mt-6 hidden space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-slate-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100 sm:block"
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
} from "~/lib/expense-tracker";
import {
  EXPENSE_SAVE_MOTIVATION,
  buildExpenseBreakdown,
  buildExpenseSummaryLines,
  buildExpenseInsights,
  collectExpenseItems,
  createDefaultBudget,
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
  normalizeExpenseStoredState,
  parseExpenseRaw,
} from "~/lib/expense-tracker";

const route = useRoute();

const { user, isReady: isAuthReady, fetchMe } = useAuth();
// Auth-dependent branches stay empty until the client resolves the session, keeping SSR hydration deterministic.
const signedIn = computed(() => isAuthReady.value && Boolean(user.value));

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
let quickSaveNoticeTimer: ReturnType<typeof setTimeout> | null = null;

const currency = ref<ExpenseCurrency>("USD");
const rangeMode = ref<ExpenseRangeMode>("month");
const budget = ref(createDefaultBudget());
const rows = ref<ExpenseRow[]>([]);
const raw = ref("");
const rawError = ref("");
const quickExpenseEnabled = ref(false);
const quickSaveNotice = ref(false);
const {
  enabled: floatingQuickExpenseEnabled,
  syncSettings: syncQuickExpenseSettings,
} = useQuickExpense();

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
  [currency, rangeMode, budget, rows, raw, quickExpenseEnabled],
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
        quickExpenseEnabled: quickExpenseEnabled.value,
      },
    });
    persistenceState.value = "saved";
    return true;
  } catch {
    persistenceState.value = "failed";
    return false;
  }
}

async function saveImmediately() {
  await nextTick();
  if (!isHydrated.value || !user.value) return false;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  persistenceState.value = "saving";
  return await saveExpenseState();
}

async function saveQuickExpenseImmediately() {
  if (!(await saveImmediately())) return;

  quickSaveNotice.value = true;
  if (quickSaveNoticeTimer) clearTimeout(quickSaveNoticeTimer);
  quickSaveNoticeTimer = setTimeout(() => {
    quickSaveNotice.value = false;
    quickSaveNoticeTimer = null;
  }, 2200);
}

function storeGuestDraft() {
  sessionStorage.setItem("chlatwork-expense-login-draft", JSON.stringify({
    currency: currency.value,
    rangeMode: rangeMode.value,
    budget: budget.value,
    raw: raw.value,
    rows: rows.value,
    quickExpenseEnabled: quickExpenseEnabled.value,
  }));
}

function applyRaw() {
  rawError.value = "";
  if (!raw.value.trim()) {
    return;
  }

  try {
    const nextRows = parseExpenseRaw(raw.value);
    rows.value = nextRows;
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
      // Some mobile browsers reject async clipboard writes despite a user action.
    }
  }

  return copyTextWithSelection(value);
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

function applyQuickExpenseSettings(enabled: boolean) {
  quickExpenseEnabled.value = enabled;
  syncQuickExpenseSettings({ enabled, currency: currency.value });
}

function handleFloatingQuickExpense(event: Event) {
  const row = (event as CustomEvent<ExpenseRow>).detail;
  if (!row || row.type !== "expense" || !row.amount) return;
  rows.value = [...rows.value, row];
  void saveImmediately();
}

onMounted(async () => {
  window.addEventListener("chlatwork:quick-expense-saved", handleFloatingQuickExpense);
  if (!isAuthReady.value) await fetchMe();

  if (user.value && !route.query.example) {
    const draft = sessionStorage.getItem("chlatwork-expense-login-draft");
    if (draft) {
      try {
        const saved = normalizeExpenseStoredState(JSON.parse(draft));
        if (!saved) throw new Error("Invalid saved expense draft");
        currency.value = saved.currency;
        rangeMode.value = saved.rangeMode;
        budget.value = saved.budget;
        raw.value = saved.raw;
        rows.value = saved.rows;
        applyQuickExpenseSettings(saved.quickExpenseEnabled ?? false);
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

  if (!user.value) {
    persistenceState.value = "guest";
    isHydrated.value = true;
    return;
  }

  try {
    const saved = normalizeExpenseStoredState(
      await $fetch<unknown>("/api/expenses/state"),
    );
    if (saved) {
      currency.value = saved.currency;
      rangeMode.value = saved.rangeMode;
      budget.value = saved.budget;
      raw.value = saved.raw;
      rows.value = saved.rows;
      applyQuickExpenseSettings(saved.quickExpenseEnabled ?? false);
    }
    persistenceState.value = "saved";
  } catch {
    persistenceState.value = "failed";
  } finally {
    isHydrated.value = true;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("chlatwork:quick-expense-saved", handleFloatingQuickExpense);
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (quickSaveNoticeTimer) clearTimeout(quickSaveNoticeTimer);
  if (saveTimer) clearTimeout(saveTimer);
});

watch(quickExpenseEnabled, (enabled) => {
  floatingQuickExpenseEnabled.value = enabled;
});

watch(currency, (nextCurrency) => {
  if (!user.value) return;
  syncQuickExpenseSettings({
    enabled: quickExpenseEnabled.value,
    currency: nextCurrency,
  });
});
</script>
