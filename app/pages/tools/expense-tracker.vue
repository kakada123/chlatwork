<template>
  <div class="mx-auto min-w-0 w-full max-w-[1440px] overflow-x-clip">
    <header class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p
          class="text-xs font-black uppercase tracking-[0.16em] text-sky-600 dark:text-cyan-200"
        >
          Your money at a glance
        </p>
        <h1
          class="mt-1 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl"
        >
          Expense dashboard
        </h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/55">
          See where your money goes and stay on budget.
        </p>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <!-- Manual entry stays available when the floating quick-expense shortcut is disabled. -->
        <button
          v-if="signedIn"
          type="button"
          :disabled="entryBusy"
          aria-haspopup="dialog"
          class="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100 sm:flex-none"
          @click="openQuickExpense"
        >
          <span aria-hidden="true" class="text-lg leading-none">＋</span>
          Add expense
        </button>
        <select
          v-model="currency"
          aria-label="Expense currency"
          :disabled="entryBusy"
          class="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold dark:border-white/10 dark:bg-[#101214]"
        >
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select>
      </div>
    </header>

    <form
      class="mb-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#101214] sm:p-4"
      @submit.prevent="applyFilter"
    >
      <fieldset
        :disabled="entryBusy"
        class="grid min-w-0 grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <div class="min-w-0">
          <p class="mb-1 text-xs font-bold text-slate-500 dark:text-white/55">
            From date
          </p>
          <ModernDateInput v-model="dateFrom" aria-label="Expense start date" />
        </div>
        <div class="min-w-0">
          <p class="mb-1 text-xs font-bold text-slate-500 dark:text-white/55">
            To date
          </p>
          <ModernDateInput v-model="dateTo" aria-label="Expense end date" />
        </div>
        <button
          type="submit"
          class="col-span-2 h-11 rounded-xl bg-sky-600 px-5 text-sm font-black text-white disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950 sm:col-span-1"
        >
          {{ loading ? "Loading…" : "Apply date filter" }}
        </button>
      </fieldset>
      <div class="mt-3 flex flex-wrap gap-2">
        <button
          v-for="preset in datePresets"
          :key="preset.label"
          type="button"
          :disabled="entryBusy"
          class="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 disabled:opacity-50 dark:border-white/10 dark:text-white/70"
          @click="applyPreset(preset.days)"
        >
          {{ preset.label }}
        </button>
      </div>
    </form>

    <p
      v-if="error"
      role="alert"
      class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200"
    >
      {{ error }}
    </p>
    <div
      v-if="saveError"
      role="alert"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200"
    >
      <p>{{ saveError }}</p>
      <button
        type="button"
        :disabled="saving"
        class="rounded-lg border border-current px-3 py-2 font-bold disabled:opacity-50"
        @click="retrySave"
      >
        Retry save
      </button>
    </div>

    <div class="grid min-w-0 grid-cols-1 items-start gap-4">
      <section
        class="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101214] sm:p-5"
        aria-label="Expense summary dashboard"
        :aria-busy="loadingSummary || !ready"
      >
        <p
          v-if="!ready || loadingSummary"
          role="status"
          class="mb-3 text-sm text-slate-500 dark:text-white/55"
        >
          Loading your spending summary…
        </p>
        <ExpenseTrackerSummaryCard
          v-if="ready && (!signedIn || summary)"
          v-model:budget="budget"
          :currency="currency"
          :range-label="rangeLabel"
          :items-count="itemsCount"
          :busy="loading || loadingEntries || editingSaving"
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
        />
      </section>

      <div class="min-w-0 space-y-3">
        <ExpenseEntryHistory
          v-model:date="entryDate"
          :rows="rows"
          :currency="currency"
          :searched-date="searchedDate"
          :loading="loadingEntries"
          :busy="entryBusy"
          :error="entrySearchError"
          @search="searchEntries()"
          @edit="openEditor"
        />
        <AuthResultAuthGate
          v-if="!signedIn && isAuthReady"
          @login="storeGuestDraft"
        />
        <p role="status" class="px-1 text-xs text-slate-500 dark:text-white/50">
          {{ persistenceMessage }}
        </p>
      </div>
    </div>

    <ExpenseEntryEditDialog
      v-if="editingEntry"
      :row="editingEntry"
      :currency="currency"
      :busy="editingSaving"
      :error="editError"
      @close="closeEditor"
      @save="saveEditedEntry"
    />

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="quickSaveNotice"
        role="status"
        class="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[115] max-w-[calc(100vw-2rem)] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-2xl sm:bottom-6 sm:max-w-sm"
      >
        <span class="block">Expense saved to your account</span>
        <span class="mt-1 block text-xs font-medium text-white/80">{{
          EXPENSE_SAVE_MOTIVATION
        }}</span>
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
import type { ExpenseRow } from "~/lib/expense-tracker";
import { openQuickExpense } from "~/composables/useQuickExpense";
import {
  EXPENSE_SAVE_MOTIVATION,
  buildExpenseBreakdown,
  buildExpenseInsights,
  collectExpenseItems,
  getBudgetPercent,
  getBudgetRemaining,
  getBudgetStatus,
  getBudgetValue,
  getExpenseExampleState,
  getExpenseMonthISO,
  getNetBalance,
  getTotalIncome,
  getTotalSpent,
  hasCompleteExpenseStoredRows,
  normalizeExpenseStoredState,
  todayISO,
} from "~/lib/expense-tracker";

const route = useRoute();
const { user, isReady: isAuthReady, fetchMe } = useAuth();
const signedIn = computed(
  () => isAuthReady.value && Boolean(user.value) && route.query.example !== "1",
);
const {
  currency,
  budget,
  quickExpenseEnabled,
  rows,
  summary,
  dateFrom,
  dateTo,
  activeRange,
  entryDate,
  searchedDate,
  loadingEntries,
  entrySearchError,
  editingSaving,
  editError,
  loading,
  loadingSummary,
  ready,
  saving,
  error,
  saveError,
  persist,
  applyFilter,
  searchEntries,
  updateEntry,
  initialize,
  appendRows,
  acceptSavedEntry,
} = useExpenseDashboard(signedIn);
const editingEntry = ref<ExpenseRow | null>(null);
const entryBusy = computed(
  () =>
    !ready.value ||
    loading.value ||
    saving.value ||
    editingSaving.value ||
    loadingEntries.value,
);
const quickSaveNotice = ref(false);
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
const datePresets = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "This month", days: 0 },
];
const { syncSettings, enabled: floatingQuickExpenseEnabled } =
  useQuickExpense();

useSeoMeta({
  title: "Expense Dashboard | ChlatWork",
  description:
    "Track expenses by date, review spending by category, and manage your budget.",
});
useHead({
  link: [
    { rel: "canonical", href: "https://chlatwork.com/tools/expense-tracker" },
  ],
});

const localItems = computed(
  () =>
    collectExpenseItems(
      rows.value.filter(
        (row) =>
          row.date >= activeRange.value.from &&
          row.date <= activeRange.value.to,
      ),
      "all",
    ).items,
);
const totalSpent = computed(() =>
  signedIn.value
    ? (summary.value?.totalSpent ?? 0)
    : getTotalSpent(localItems.value),
);
const totalIncome = computed(() =>
  signedIn.value
    ? (summary.value?.totalIncome ?? 0)
    : getTotalIncome(localItems.value),
);
const itemsCount = computed(() =>
  signedIn.value ? (summary.value?.itemsCount ?? 0) : localItems.value.length,
);
const categoryBreakdown = computed(() =>
  signedIn.value
    ? (summary.value?.categoryBreakdown ?? [])
    : buildExpenseBreakdown(localItems.value, totalSpent.value),
);
const netBalance = computed(() =>
  getNetBalance(totalIncome.value, totalSpent.value),
);
const rangeLabel = computed(
  () => `${activeRange.value.from} – ${activeRange.value.to}`,
);
const dailyAvg = computed(() => {
  const days =
    (Date.parse(activeRange.value.to) - Date.parse(activeRange.value.from)) /
      86400000 +
    1;
  return days > 0 ? totalSpent.value / days : 0;
});
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
const insights = computed(() =>
  buildExpenseInsights({
    currency: currency.value,
    items: [],
    itemsCount: itemsCount.value,
    totalIncome: totalIncome.value,
    totalSpent: totalSpent.value,
    netBalance: netBalance.value,
    categoryBreakdown: categoryBreakdown.value,
    topExpenses: [],
    budgetValue: budgetValue.value,
    budgetRemaining: budgetRemaining.value,
    dailyAvg: dailyAvg.value,
  }),
);
const persistenceMessage = computed(() => {
  if (!signedIn.value) return "Sign in to save expenses to your account.";
  if (!ready.value) return "Loading your dashboard…";
  if (saveError.value) return "Changes need your attention.";
  return saving.value ? "Saving changes…" : "Saved securely to your account.";
});

function applyPreset(days: number) {
  const today = new Date();
  if (days === 0) {
    dateFrom.value = `${getExpenseMonthISO(today)}-01`;
    dateTo.value = todayISO(
      new Date(today.getFullYear(), today.getMonth() + 1, 0),
    );
  } else {
    dateTo.value = todayISO(today);
    today.setDate(today.getDate() - days + 1);
    dateFrom.value = todayISO(today);
  }
  void applyFilter();
}

function showSavedNotice() {
  quickSaveNotice.value = true;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    quickSaveNotice.value = false;
  }, 2200);
}

async function retrySave() {
  await persist();
}

function storeGuestDraft() {
  sessionStorage.setItem(
    "chlatwork-expense-login-draft",
    JSON.stringify({
      currency: currency.value,
      budget: budget.value,
      rows: rows.value,
    }),
  );
}

function openEditor(row: ExpenseRow) {
  if (entryBusy.value) return;
  // A detached snapshot keeps modal typing and Cancel separate from saved list data.
  editingEntry.value = { ...row };
  editError.value = "";
}

function closeEditor() {
  if (editingSaving.value) return;
  editingEntry.value = null;
  editError.value = "";
}

async function saveEditedEntry(row: ExpenseRow) {
  if (!(await updateEntry(row))) return;
  editingEntry.value = null;
  if (signedIn.value) showSavedNotice();
}

function handleFloatingQuickExpense(event: Event) {
  const row = (event as CustomEvent<ExpenseRow>).detail;
  if (row?.id && row.type === "expense") acceptSavedEntry(row);
}

watch(currency, (value) => {
  if (ready.value && signedIn.value)
    syncSettings({
      enabled: floatingQuickExpenseEnabled.value,
      currency: value,
    });
});

onMounted(async () => {
  window.addEventListener(
    "chlatwork:quick-expense-saved",
    handleFloatingQuickExpense,
  );
  if (!isAuthReady.value) await fetchMe();
  const example = route.query.example === "1" ? getExpenseExampleState() : null;
  await initialize(
    example
      ? normalizeExpenseStoredState({
          ...example,
          currency: route.query.c === "KHR" ? "KHR" : "USD",
        })
      : null,
  );
  if (!signedIn.value || !ready.value) return;
  syncSettings({
    enabled: quickExpenseEnabled.value,
    currency: currency.value,
  });
  const draft = sessionStorage.getItem("chlatwork-expense-login-draft");
  if (draft) {
    try {
      const parsed: unknown = JSON.parse(draft);
      if (!hasCompleteExpenseStoredRows(parsed))
        throw new Error("Incomplete draft");
      const saved = normalizeExpenseStoredState(parsed);
      if (!saved) throw new Error("Invalid draft");
      currency.value = saved.currency;
      budget.value = saved.budget;
      // Retain client IDs in the recoverable draft so a retry cannot duplicate saved entries.
      saved.rows = saved.rows.map((row) => ({
        ...row,
        id: row.id ?? crypto.randomUUID(),
        updatedAt: undefined,
      }));
      sessionStorage.setItem(
        "chlatwork-expense-login-draft",
        JSON.stringify(saved),
      );
      if (await appendRows(saved.rows))
        sessionStorage.removeItem("chlatwork-expense-login-draft");
    } catch {
      error.value =
        "Your expense draft is kept on this device. Reload to try importing it again.";
    }
  }
});

onBeforeRouteLeave(async () => !signedIn.value || (await persist()));
onBeforeUnmount(() => {
  window.removeEventListener(
    "chlatwork:quick-expense-saved",
    handleFloatingQuickExpense,
  );
  if (noticeTimer) clearTimeout(noticeTimer);
});
</script>
