<template>
  <div
    class="mx-auto w-full min-w-0 max-w-[1280px] space-y-5 pb-4 text-slate-950 dark:text-white"
  >
    <header
      class="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 sm:hidden"
      aria-label="Expense tracker controls"
    >
      <NuxtLink
        :to="route.query.from === 'account' ? '/account' : '/tools'"
        :aria-label="
          route.query.from === 'account' ? 'Back to Account' : 'Back to tools'
        "
        class="grid size-8 place-items-center rounded-full ring-1 ring-slate-200 dark:ring-white/15"
        ><ChevronLeft class="size-5" aria-hidden="true"
      /></NuxtLink>
      <div class="min-w-0">
        <h1
          class="truncate text-[clamp(0.875rem,4.4vw,1.125rem)] font-black tracking-tight"
        >
          Expense Tracker
        </h1>
        <p
          class="mt-0.5 truncate text-[10px] text-slate-500 dark:text-white/50"
        >
          Track spending. Stay on budget.
        </p>
      </div>
      <button
        type="button"
        :aria-expanded="mobileFiltersOpen"
        aria-controls="expense-period-controls"
        :aria-label="'Change summary period: ' + rangeLabel"
        class="flex min-h-10 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1 ring-slate-200 dark:ring-white/15"
        @click="mobileFiltersOpen = !mobileFiltersOpen"
      >
        <CalendarDays class="size-3.5" aria-hidden="true" />{{
          mobilePeriodLabel
        }}<ChevronDown class="size-3" aria-hidden="true" />
      </button>
      <button
        v-if="signedIn"
        type="button"
        :disabled="entryBusy"
        aria-label="Add expense"
        aria-haspopup="dialog"
        class="grid size-10 place-items-center rounded-full bg-sky-600 text-white disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950"
        @click="openQuickExpense"
      >
        <Plus class="size-5" aria-hidden="true" />
      </button>
      <NuxtLink
        v-else
        to="/login"
        @click="storeGuestDraft"
        aria-label="Sign in to add expenses"
        class="grid size-10 place-items-center rounded-full bg-sky-600 text-white dark:bg-cyan-200 dark:text-slate-950"
        ><Plus class="size-5" aria-hidden="true"
      /></NuxtLink>
    </header>
    <div v-if="signedIn" class="flex justify-end sm:hidden">
      <button
        type="button"
        :disabled="entryBusy"
        aria-haspopup="dialog"
        class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700 disabled:opacity-50 dark:bg-emerald-400/10 dark:text-emerald-300"
        @click="openQuickIncome"
      >
        <Plus class="size-4" aria-hidden="true" />Add income
      </button>
    </div>
    <header class="hidden flex-wrap items-center justify-between gap-4 sm:flex">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-cyan-200/10 dark:text-cyan-200 sm:flex"
          ><BarChart3 class="h-7 w-7" aria-hidden="true"
        /></span>
        <div class="min-w-0">
          <h1 class="text-2xl font-black tracking-tight sm:text-3xl">
            Expense Dashboard
          </h1>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/50 sm:text-sm">
            Track your spending, stay on budget, and build better habits.
          </p>
        </div>
      </div>
      <div class="flex w-full items-center gap-2 sm:w-auto">
        <button
          v-if="signedIn"
          type="button"
          :disabled="!favoritesReady || isFavoriteSaving('expense-tracker')"
          :aria-pressed="isFavorite('expense-tracker')"
          :aria-label="
            isFavorite('expense-tracker')
              ? 'Remove from favorites'
              : 'Add to favorites'
          "
          class="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
          :class="
            isFavorite('expense-tracker')
              ? 'bg-sky-500/10 text-sky-700 dark:bg-cyan-200/10 dark:text-cyan-200'
              : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/55'
          "
          @click="toggleFavorite('expense-tracker')"
        >
          <Heart
            class="h-4 w-4"
            :fill="isFavorite('expense-tracker') ? 'currentColor' : 'none'"
            aria-hidden="true"
          /><span class="hidden sm:inline">{{
            isFavorite("expense-tracker") ? "Favorited" : "Favorite"
          }}</span>
        </button>
        <!-- Manual entry remains available when the optional floating shortcut is off. -->
        <button
          v-if="signedIn"
          type="button"
          :disabled="entryBusy"
          aria-haspopup="dialog"
          class="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-sm font-bold text-emerald-700 disabled:opacity-50 dark:bg-emerald-400/10 dark:text-emerald-300"
          @click="openQuickIncome"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />Add income
        </button>
        <button
          v-if="signedIn"
          type="button"
          :disabled="entryBusy"
          aria-haspopup="dialog"
          class="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white transition hover:bg-sky-700 disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100 sm:flex-none"
          @click="openQuickExpense"
        >
          <Plus class="h-4 w-4" aria-hidden="true" />Add expense
        </button>
        <select
          v-model="currency"
          aria-label="Expense currency"
          :disabled="entryBusy"
          class="h-10 rounded-xl bg-white px-3 text-xs font-semibold ring-1 ring-slate-200 dark:bg-[#101214] dark:ring-white/10"
        >
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select>
      </div>
    </header>

    <div
      id="expense-period-controls"
      class="flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08]"
      :class="mobileFiltersOpen ? 'flex' : 'hidden sm:flex'"
      aria-label="Summary date range"
    >
      <details ref="rangePicker" class="relative w-full lg:w-auto">
        <summary
          class="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.035]"
        >
          <CalendarDays
            class="h-5 w-5 shrink-0 text-sky-600 dark:text-cyan-200"
            aria-hidden="true"
          />
          <span class="min-w-0 flex-1"
            ><span
              class="block text-[10px] font-medium text-slate-400 dark:text-white/40"
              >Summary period</span
            ><span
              class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold sm:text-sm"
              >{{ formatExpenseRangeDate(activeRange.from)
              }}<ArrowRight
                class="h-3.5 w-3.5 text-slate-400 dark:text-white/30"
                aria-hidden="true"
              />{{ formatExpenseRangeDate(activeRange.to) }}</span
            ></span
          >
          <ChevronDown
            class="h-4 w-4 text-slate-400 dark:text-white/40"
            aria-hidden="true"
          />
        </summary>
        <form
          class="mt-2 grid w-full gap-3 rounded-xl bg-white p-2 dark:bg-[#181b1e] sm:absolute sm:left-0 sm:top-full sm:z-40 sm:rounded-2xl sm:p-4 sm:shadow-xl sm:ring-1 sm:ring-slate-200 dark:sm:ring-white/10 lg:w-80"
          @submit.prevent="applyCustomRange"
        >
          <fieldset
            :disabled="entryBusy"
            class="grid min-w-0 grid-cols-2 gap-3"
          >
            <div class="min-w-0">
              <p class="mb-1 text-xs text-slate-500 dark:text-white/50">
                From date
              </p>
              <ModernDateInput
                v-model="dateFrom"
                aria-label="Expense start date"
              />
            </div>
            <div class="min-w-0">
              <p class="mb-1 text-xs text-slate-500 dark:text-white/50">
                To date
              </p>
              <ModernDateInput v-model="dateTo" aria-label="Expense end date" />
            </div>
            <button
              type="submit"
              class="col-span-2 min-h-10 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950"
            >
              {{ loading ? "Loading…" : "Apply dates" }}
            </button>
          </fieldset>
        </form>
      </details>
      <div
        class="flex w-full flex-wrap gap-1 lg:w-auto"
        role="group"
        aria-label="Summary period shortcuts"
      >
        <button
          v-for="preset in datePresets"
          :key="preset.key"
          type="button"
          :disabled="entryBusy"
          :aria-pressed="isPresetActive(preset.key)"
          class="min-h-9 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50"
          :class="
            isPresetActive(preset.key)
              ? 'bg-sky-600 text-white dark:bg-cyan-200 dark:text-slate-950'
              : 'text-slate-500 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5'
          "
          @click="applyPreset(preset.key)"
        >
          {{ preset.label }}
        </button>
        <button
          type="button"
          :disabled="entryBusy"
          class="min-h-9 rounded-full px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-white/60 dark:hover:bg-white/5"
          @click="showCustomRange"
        >
          Custom
        </button>
      </div>
      <label
        class="flex items-center gap-2 text-xs text-slate-500 dark:text-white/55 sm:hidden"
        >Currency<select
          v-model="currency"
          :disabled="entryBusy"
          class="h-9 rounded-lg bg-slate-100 px-2 font-semibold text-slate-950 dark:bg-white/5 dark:text-white"
        >
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select></label
      >
      <button
        v-if="signedIn"
        type="button"
        :disabled="!favoritesReady || isFavoriteSaving('expense-tracker')"
        :aria-pressed="isFavorite('expense-tracker')"
        class="flex min-h-9 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-sky-700 disabled:opacity-50 dark:text-cyan-200 sm:hidden"
        @click="toggleFavorite('expense-tracker')"
      >
        <Heart
          class="size-4"
          :fill="isFavorite('expense-tracker') ? 'currentColor' : 'none'"
          aria-hidden="true"
        />{{ isFavorite("expense-tracker") ? "Favorited" : "Favorite" }}
      </button>
    </div>

    <p
      v-if="error || favoriteError"
      role="alert"
      class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
    >
      {{ error || favoriteError }}
    </p>
    <div
      v-if="saveError"
      role="alert"
      class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-200"
    >
      <p>{{ saveError }}</p>
      <button
        type="button"
        :disabled="saving"
        class="min-h-10 rounded-lg px-3 font-bold ring-1 ring-current disabled:opacity-50"
        @click="retrySave"
      >
        Retry save
      </button>
    </div>

    <section
      class="min-w-0"
      aria-label="Expense summary dashboard"
      :aria-busy="loadingSummary || !ready"
    >
      <p
        v-if="!ready || loadingSummary"
        role="status"
        class="mb-3 text-xs text-slate-500 dark:text-white/50"
      >
        Loading your spending summary…
      </p>
      <ExpenseTrackerSummaryCard
        v-if="ready && (!signedIn || summary)"
        v-model:budget="budget"
        v-model:income-visible="incomeVisible"
        v-model:net-balance-visible="netBalanceVisible"
        :currency="currency"
        :range-label="rangeLabel"
        :range-from="activeRange.from"
        :range-to="activeRange.to"
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
        :category-breakdown="categoryBreakdown"
        :trend-data="dailyTrend"
      >
        <template #entries>
          <ExpenseEntryHistory
            v-model:date="entryDate"
            :rows="rows"
            :currency="currency"
            :income-visible="incomeVisible"
            :searched-date="searchedDate"
            :loading="loadingEntries || !ready"
            :busy="entryBusy"
            :error="entrySearchError"
            @search="searchEntries()"
            @edit="openEditor"
            @toggle-income="incomeVisible = !incomeVisible"
          />
        </template>
      </ExpenseTrackerSummaryCard>
      <div
        v-else-if="!ready || loadingSummary"
        class="grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-hidden="true"
      >
        <div
          v-for="card in 4"
          :key="card"
          class="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"
        />
      </div>
      <!-- A failed summary request must not hide successfully loaded daily entries. -->
      <ExpenseEntryHistory
        v-else
        v-model:date="entryDate"
        :rows="rows"
        :currency="currency"
        :income-visible="incomeVisible"
        :searched-date="searchedDate"
        :loading="loadingEntries"
        :busy="entryBusy"
        :error="entrySearchError"
        @search="searchEntries()"
        @edit="openEditor"
        @toggle-income="incomeVisible = !incomeVisible"
      />
    </section>
    <AuthResultAuthGate
      v-if="!signedIn && isAuthReady"
      @login="storeGuestDraft"
    />
    <p
      role="status"
      class="text-right text-[11px] text-slate-400 dark:text-white/35"
    >
      {{ persistenceMessage }}
    </p>

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
        class="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-[115] max-w-[calc(100vw-2rem)] rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-xl sm:bottom-6 sm:max-w-sm"
      >
        <span class="block">Expense saved to your account</span
        ><span class="mt-1 block text-xs font-medium text-white/80">{{
          EXPENSE_SAVE_MOTIVATION
        }}</span>
      </div>
    </Transition>
    <details class="text-xs text-slate-400 dark:text-white/35">
      <summary class="w-fit cursor-pointer">About this tracker</summary>
      <p class="mt-2 max-w-2xl leading-5">
        For planning and education. Reconcile totals with your receipts and
        statements.
        <NuxtLink to="/editorial-policy" class="underline"
          >Editorial policy</NuxtLink
        >
        · <NuxtLink to="/disclaimer" class="underline">Disclaimer</NuxtLink> ·
        <NuxtLink to="/contact" class="underline">Contact</NuxtLink>
      </p>
    </details>
  </div>
</template>

<script setup lang="ts">
import ExpenseEntryHistory from "~/components/expense-tracker/ExpenseEntryHistory.vue";
import ExpenseEntryEditDialog from "~/components/expense-tracker/ExpenseEntryEditDialog.vue";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Heart,
  Plus,
} from "lucide-vue-next";
import {
  formatExpenseRangeDate,
  getExpensePresetRange,
  type ExpensePeriodPreset,
} from "~/lib/expense-dashboard-view";
import type { ExpenseRow } from "~/lib/expense-tracker";
import { openQuickExpense, openQuickIncome } from "~/composables/useQuickExpense";
import {
  EXPENSE_SAVE_MOTIVATION,
  buildExpenseBreakdown,
  collectExpenseItems,
  getBudgetPercent,
  getBudgetRemaining,
  getBudgetStatus,
  getBudgetValue,
  getExpenseExampleState,
  getNetBalance,
  getTotalIncome,
  getTotalSpent,
  hasCompleteExpenseStoredRows,
  normalizeExpenseStoredState,
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
const incomeVisible = ref(false);
const netBalanceVisible = ref(false);
// Revealing one period must not automatically reveal another period or currency.
watch(
  [() => activeRange.value.from, () => activeRange.value.to, currency],
  () => {
    incomeVisible.value = false;
    netBalanceVisible.value = false;
  },
);
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
const rangePicker = ref<HTMLDetailsElement | null>(null);
const mobileFiltersOpen = ref(false);
const mobilePeriodLabel = computed(() => {
  const { from, to } = activeRange.value;
  const start = new Date(from + "T00:00:00Z");
  const last = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
  )
    .toISOString()
    .slice(0, 10);
  if (from.endsWith("-01") && to === last)
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(start);
  if (from === to)
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(start);
  return "Date range";
});
const datePresets: { label: string; key: ExpensePeriodPreset }[] = [
  { label: "Today", key: "today" },
  { label: "Last 7 days", key: "week" },
  { label: "This month", key: "month" },
  { label: "Last month", key: "last-month" },
  { label: "This year", key: "year" },
];
const {
  isFavorite,
  toggleFavorite,
  isFavoriteSaving,
  favoritesReady,
  favoriteError,
} = useToolFavorites();
const { syncSettings, enabled: floatingQuickExpenseEnabled } =
  useQuickExpense();

useSeoMeta({
  title: "Expense Dashboard | ChlatWork",
  description:
    "Track expenses by date, review spending by category, and manage your budget.",
});
const { canonical } = useProductDomain();
useHead(() => ({
  link: [
    { rel: "canonical", href: canonical.value },
  ],
}));

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
const dailyTrend = computed(() =>
  signedIn.value
    ? (summary.value?.dailyTrend ?? [])
    : localItems.value.map((item) => ({
        date: item.date,
        spent: item.type === "expense" ? item.amount : 0,
        income: item.type === "income" ? item.amount : 0,
      })),
);
const persistenceMessage = computed(() => {
  if (!signedIn.value) return "Sign in to save expenses to your account.";
  if (!ready.value) return "Loading your dashboard…";
  if (saveError.value) return "Changes need your attention.";
  return saving.value ? "Saving changes…" : "Saved securely to your account.";
});

function isPresetActive(preset: ExpensePeriodPreset) {
  const range = getExpensePresetRange(preset);
  return (
    range.from === activeRange.value.from && range.to === activeRange.value.to
  );
}
async function applyPreset(preset: ExpensePeriodPreset) {
  const range = getExpensePresetRange(preset);
  dateFrom.value = range.from;
  dateTo.value = range.to;
  await applyFilter();
  if (
    range.from === activeRange.value.from &&
    range.to === activeRange.value.to
  ) {
    if (rangePicker.value) rangePicker.value.open = false;
    mobileFiltersOpen.value = false;
  }
}
function showCustomRange() {
  if (rangePicker.value) rangePicker.value.open = !rangePicker.value.open;
}
async function applyCustomRange() {
  await applyFilter();
  if (
    rangePicker.value &&
    dateFrom.value === activeRange.value.from &&
    dateTo.value === activeRange.value.to
  ) {
    rangePicker.value.open = false;
    mobileFiltersOpen.value = false;
  }
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
  if (row?.id && (row.type === "expense" || row.type === "income"))
    acceptSavedEntry(row);
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
