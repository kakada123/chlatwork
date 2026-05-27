<template>
  <div class="mx-auto w-full max-w-[1440px]">
    <ExpenseTrackerHeader
      :share-state="shareState"
      :share-url="lastShareUrl"
      :save-state="saveState"
      :save-message="saveMessage"
      :saved-record-id="savedRecordId"
      :is-logged-in="Boolean(saveProfile)"
      :profile-label="saveProfile?.label || ''"
      @reset="reset"
      @login="openSaveLogin"
      @save="saveToDatabase"
      @share="shareLink"
      @logout="logoutSaveSession"
    />

    <form
      v-if="isSaveLoginOpen"
      class="mb-4 rounded-xl border border-sky-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div
        class="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
      >
        <div
          v-if="telegramBotUsername"
          ref="telegramLoginContainer"
          class="min-h-11"
        />
        <p v-else class="text-sm text-gray-600 dark:text-white/65">
          Set <code>NUXT_PUBLIC_TELEGRAM_BOT_USERNAME</code> in the Nuxt app and
          <code>TELEGRAM_BOT_TOKEN</code> in the API to enable Telegram login.
        </p>
      </div>

      <p
        v-if="loginError"
        class="mt-2 text-sm text-red-600 dark:text-red-300"
      >
        {{ loginError }}
      </p>
      <p class="mt-2 text-xs text-gray-500 dark:text-white/50">
        Preview and share still work without login. Telegram login creates a
        secure session for confirmed saves and your saved history.
      </p>
    </form>

    <section
      v-if="saveProfile"
      class="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
            Profile
          </p>
          <h2 class="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
            {{ saveProfile.label }}
          </h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-white/55">
            Saved records are listed by the month they were saved.
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label class="text-xs font-semibold text-gray-600 dark:text-white/60">
            Month
            <input
              v-model="savedRecordsMonth"
              class="mt-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:focus:ring-cyan-200/15"
              type="month"
            />
          </label>

          <button
            class="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.08]"
            type="button"
            :disabled="savedRecordsState === 'loading'"
            @click="loadSavedRecords"
          >
            {{ savedRecordsState === "loading" ? "Loading" : "Refresh" }}
          </button>
        </div>
      </div>

      <p
        v-if="savedRecordsMessage"
        class="mt-3 text-sm"
        :class="savedRecordsState === 'error' ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-white/55'"
      >
        {{ savedRecordsMessage }}
      </p>

      <div
        v-if="savedRecords.length"
        class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="record in savedRecords"
          :key="record.id"
          class="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-gray-950 dark:text-white">
                {{ formatSavedRecordDate(record.createdAt) }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-white/50">
                {{ record.summary.itemsCount }} rows
              </p>
            </div>
            <button
              class="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-white dark:border-white/10 dark:text-white/70 dark:hover:bg-white/[0.08]"
              type="button"
              @click="loadSavedRecord(record.id)"
            >
              Open
            </button>
          </div>

          <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt class="text-xs text-gray-500 dark:text-white/45">Spent</dt>
              <dd class="font-semibold text-gray-950 dark:text-white">
                {{ formatSavedAmount(record.summary.totalSpent, record.currency) }}
              </dd>
            </div>
            <div>
              <dt class="text-xs text-gray-500 dark:text-white/45">Income</dt>
              <dd class="font-semibold text-gray-950 dark:text-white">
                {{ formatSavedAmount(record.summary.totalIncome, record.currency) }}
              </dd>
            </div>
          </dl>
        </article>
      </div>

      <p
        v-else-if="savedRecordsState !== 'loading' && !savedRecordsMessage"
        class="mt-4 text-sm text-gray-500 dark:text-white/55"
      >
        No saved records for this month.
      </p>
    </section>

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
  formatExpenseAmount,
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
  parseExpenseAmount,
  parseExpenseRaw,
  parseExpenseSharePayload,
  roundExpense,
} from "~/lib/expense-tracker";

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();

type ExpenseShortLinkResponse = {
  id: string;
  expiresInSeconds: number;
};

type ExpenseStoredShareResponse = {
  payload: string;
};

type ExpenseShareState = "idle" | "busy" | "copied" | "shared" | "ready";
type ExpenseSaveState =
  | "idle"
  | "login-required"
  | "logging-in"
  | "saving"
  | "saved"
  | "error";

type ExpenseUserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  label: string;
  telegramUsername?: string | null;
  telegramPhotoUrl?: string | null;
};

type ExpenseLoginResponse = {
  accessToken: string;
  expiresAt: string;
  user: ExpenseUserProfile;
};

type TelegramLoginPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    __chlatworkExpenseTelegramLogin?: (payload: TelegramLoginPayload) => void;
  }
}

type ExpenseSavedRecordResponse = {
  id: string;
};

type ExpenseSavedRecordListItem = {
  id: string;
  currency: ExpenseCurrency;
  rangeMode: ExpenseRangeMode;
  budget: {
    period: "monthly" | "weekly";
    amount: string;
  };
  summary: {
    itemsCount: number;
    totalIncome: number;
    totalSpent: number;
    netBalance: number;
    budgetAmount: number;
    budgetRemaining: number;
    categoryTotals: Array<{
      category: string;
      total: number;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

type ExpenseSavedRecordDetail = ExpenseSavedRecordListItem & {
  rawText: string | null;
  rows: ExpenseSaveRow[];
};

type ExpenseSaveRow = {
  type: "expense" | "income";
  date: string;
  category: string;
  customCategory?: string;
  note?: string;
  amount: string;
};

const LEGACY_SAVE_AUTH_STORAGE_KEY = "chlatwork-expense-save-auth";

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
const shareState = ref<ExpenseShareState>("idle");
const lastShareUrl = ref("");
const saveState = ref<ExpenseSaveState>("idle");
const saveMessage = ref("");
const savedRecordId = ref("");
const saveProfile = ref<ExpenseUserProfile | null>(null);
const isSaveLoginOpen = ref(false);
const shouldSaveAfterAuth = ref(false);
const loginError = ref("");
const telegramLoginContainer = ref<HTMLElement | null>(null);
const savedRecords = ref<ExpenseSavedRecordListItem[]>([]);
const savedRecordsMonth = ref(getCurrentMonthKey());
const savedRecordsState = ref<"idle" | "loading" | "error">("idle");
const savedRecordsMessage = ref("");

let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let shareTimer: ReturnType<typeof setTimeout> | null = null;

const currency = ref<ExpenseCurrency>("USD");
const rangeMode = ref<ExpenseRangeMode>("month");
const budget = ref(createDefaultBudget());
const rows = ref<ExpenseRow[]>(createDefaultExpenseRows());
const raw = ref("");
const rawError = ref("");
const expenseApiBaseUrl = computed(() =>
  String(config.public.expenseTrackerApiBaseUrl || "").replace(/\/$/, ""),
);
const telegramBotUsername = computed(() =>
  String(config.public.expenseTrackerTelegramBotUsername || "")
    .trim()
    .replace(/^@/, ""),
);

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

function dropLegacyStoredToken() {
  if (import.meta.client) {
    window.localStorage.removeItem(LEGACY_SAVE_AUTH_STORAGE_KEY);
  }
}

function rememberSaveProfile(profile: ExpenseUserProfile) {
  saveProfile.value = profile;
  dropLegacyStoredToken();
}

function clearSaveAuth() {
  saveProfile.value = null;
  savedRecords.value = [];
  savedRecordsMessage.value = "";
  savedRecordsState.value = "idle";
  dropLegacyStoredToken();
}

async function restoreSaveSession() {
  dropLegacyStoredToken();

  try {
    const profile = await $fetch<ExpenseUserProfile>(
      `${expenseApiBaseUrl.value}/auth/me`,
      {
        credentials: "include",
      },
    );

    rememberSaveProfile(profile);
    await loadSavedRecords();
  } catch {
    clearSaveAuth();
  }
}

async function logoutSaveSession() {
  try {
    await $fetch(`${expenseApiBaseUrl.value}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // The local session should still clear even if the API is temporarily unavailable.
  }

  clearSaveAuth();
  shouldSaveAfterAuth.value = false;
  isSaveLoginOpen.value = false;
  saveState.value = "idle";
  saveMessage.value = "Logged out. Preview and share still work without login.";
}

function openSaveLogin(saveAfterAuth = false) {
  shouldSaveAfterAuth.value = saveAfterAuth;
  isSaveLoginOpen.value = true;
  loginError.value = "";
  saveState.value = saveAfterAuth ? "login-required" : "idle";
  saveMessage.value = saveAfterAuth
    ? "Telegram login is required before saving to the database."
    : "Login with Telegram to view your profile and saved Expense Tracker records.";

  void nextTick(renderTelegramLoginWidget);
}

const parsedRowsState = computed(() =>
  collectExpenseItems(rows.value, rangeMode.value),
);
const allRowsState = computed(() => collectExpenseItems(rows.value, "all"));

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
  const query =
    currency.value === "KHR" ? "?example=1&c=KHR" : "?example=1";

  return `${window.location.origin}${route.path}${query}`;
}

function replaceShareQuery(query: Record<string, string | undefined>) {
  void router.replace({ query }).catch(() => {});
}

function getCurrentShareId() {
  const id = route.query.id;

  return typeof id === "string" && id.trim() ? id.trim() : "";
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
  textarea.focus({ preventScroll: true });
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

async function copyShareUrl(url: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Mobile browsers can reject async clipboard writes after API/link work.
    }
  }

  return copyTextWithSelection(url);
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

  return (await copyShareUrl(url)) ? "copied" : "ready";
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
  lastShareUrl.value = "";

  const currentShareId = getCurrentShareId();

  if (!currentShareId && isExpenseExampleState()) {
    const query =
      currency.value === "KHR" ? { example: "1", c: "KHR" } : { example: "1" };
    const url = buildExampleShareUrl();

    lastShareUrl.value = url;
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

  let url = buildInlineShareUrl(s);

  try {
    const response = await $fetch<ExpenseShortLinkResponse>(
      "/api/expense-share",
      {
        method: "POST",
        body: currentShareId ? { id: currentShareId, payload: s } : { payload: s },
      },
    );

    if (response.id) {
      replaceShareQuery({ id: response.id });
      url = `${window.location.origin}${route.path}?id=${encodeURIComponent(response.id)}`;
    }
  } catch {
    // Keep sharing usable in local/dev environments where Upstash is not configured.
    replaceShareQuery({ s });
  }

  lastShareUrl.value = url;
  showShareResult(await shareUrlOnDevice(url));
}

function normalizeMoneyForSave(value: string) {
  return String(roundExpense(parseExpenseAmount(value)));
}

function buildRowsForSave(): ExpenseSaveRow[] {
  return rows.value.flatMap((row) => {
    const type = row.type === "income" ? "income" : "expense";
    const date = (row.date ?? "").trim();
    const category = (row.category ?? "").trim();
    const customCategory = (row.customCategory ?? "").trim();
    const amountRaw = (row.amount ?? "").trim();

    if (!date || !category || !amountRaw) {
      return [];
    }

    return [
      {
        type,
        date,
        category,
        ...(category === "__custom__" ? { customCategory } : {}),
        note: (row.note ?? "").trim(),
        amount: normalizeMoneyForSave(amountRaw),
      },
    ];
  });
}

function buildSavePayload() {
  return {
    currency: currency.value,
    rangeMode: rangeMode.value,
    budget: {
      period: budget.value.period,
      amount: budget.value.amount.trim()
        ? normalizeMoneyForSave(budget.value.amount)
        : "",
    },
    rawText: raw.value,
    rows: buildRowsForSave(),
  };
}

function extractApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = error as {
      data?: {
        message?: string | string[];
        statusMessage?: string;
      };
      message?: string;
      statusMessage?: string;
    };
    const message =
      maybeResponse.data?.message ??
      maybeResponse.data?.statusMessage ??
      maybeResponse.statusMessage ??
      maybeResponse.message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

function requireSavableRows() {
  if (allRowsState.value.error) {
    saveState.value = "error";
    saveMessage.value = allRowsState.value.error;
    return false;
  }

  if (!allRowsState.value.items.length) {
    saveState.value = "error";
    saveMessage.value = "Add at least one completed row before saving.";
    return false;
  }

  return true;
}

function getCurrentMonthKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  return `${now.getFullYear()}-${month}`;
}

function formatSavedAmount(value: number, recordCurrency: ExpenseCurrency) {
  return formatExpenseAmount(value, recordCurrency);
}

function formatSavedRecordDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function loadSavedRecords() {
  if (!saveProfile.value) {
    return;
  }

  savedRecordsState.value = "loading";
  savedRecordsMessage.value = "";

  try {
    savedRecords.value = await $fetch<ExpenseSavedRecordListItem[]>(
      `${expenseApiBaseUrl.value}/expense-trackers`,
      {
        credentials: "include",
        query: {
          month: savedRecordsMonth.value,
        },
      },
    );
    savedRecordsState.value = "idle";
  } catch (error) {
    const message = extractApiError(error, "Unable to load saved records.");

    if (message.toLowerCase().includes("login")) {
      clearSaveAuth();
      openSaveLogin(false);
    }

    savedRecordsState.value = "error";
    savedRecordsMessage.value = message;
  }
}

async function loadSavedRecord(recordId: string) {
  try {
    const record = await $fetch<ExpenseSavedRecordDetail>(
      `${expenseApiBaseUrl.value}/expense-trackers/${encodeURIComponent(recordId)}`,
      {
        credentials: "include",
      },
    );

    currency.value = record.currency;
    rangeMode.value = record.rangeMode;
    budget.value = record.budget;
    raw.value = record.rawText ?? "";
    rawError.value = "";
    rows.value = record.rows.map((row) => ({
      type: row.type,
      date: row.date,
      category: row.category,
      customCategory: row.customCategory,
      note: row.note ?? "",
      showNote: Boolean(row.note),
      amount: row.amount,
    }));
    saveState.value = "idle";
    saveMessage.value = `Loaded saved record from ${formatSavedRecordDate(record.createdAt)}.`;
    savedRecordId.value = record.id;
  } catch (error) {
    saveState.value = "error";
    saveMessage.value = extractApiError(error, "Unable to open saved record.");
  }
}

async function saveRecordWithSession() {
  saveState.value = "saving";
  saveMessage.value = "";
  savedRecordId.value = "";

  const response = await $fetch<ExpenseSavedRecordResponse>(
    `${expenseApiBaseUrl.value}/expense-trackers`,
    {
      method: "POST",
      credentials: "include",
      body: buildSavePayload(),
    },
  );

  savedRecordId.value = response.id;
  saveState.value = "saved";
  saveMessage.value = "Saved to database.";
  await loadSavedRecords();
}

async function saveToDatabase() {
  if (saveState.value === "saving" || saveState.value === "logging-in") {
    return;
  }

  loginError.value = "";

  if (!requireSavableRows()) {
    return;
  }

  if (!saveProfile.value) {
    openSaveLogin(true);
    return;
  }

  try {
    await saveRecordWithSession();
  } catch (error) {
    const message = extractApiError(error, "Unable to save Expense Tracker record.");

    if (message.toLowerCase().includes("login")) {
      clearSaveAuth();
      openSaveLogin(true);
    } else {
      saveState.value = "error";
    }

    saveMessage.value = message;
  }
}

function renderTelegramLoginWidget() {
  if (
    !import.meta.client ||
    !isSaveLoginOpen.value ||
    !telegramBotUsername.value ||
    !telegramLoginContainer.value
  ) {
    return;
  }

  telegramLoginContainer.value.innerHTML = "";
  // Telegram's widget invokes a global callback, so keep it scoped to this page lifecycle.
  window.__chlatworkExpenseTelegramLogin = (payload) => {
    void loginWithTelegramAndSave(payload);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.setAttribute("data-telegram-login", telegramBotUsername.value);
  script.setAttribute("data-size", "large");
  script.setAttribute("data-userpic", "false");
  script.setAttribute("data-request-access", "write");
  script.setAttribute("data-onauth", "window.__chlatworkExpenseTelegramLogin(user)");

  telegramLoginContainer.value.appendChild(script);
}

async function loginWithTelegramAndSave(payload: TelegramLoginPayload) {
  loginError.value = "";

  if (shouldSaveAfterAuth.value && !requireSavableRows()) {
    return;
  }

  saveState.value = "logging-in";
  saveMessage.value = "";

  try {
    const response = await $fetch<ExpenseLoginResponse>(
      `${expenseApiBaseUrl.value}/auth/telegram`,
      {
        method: "POST",
        credentials: "include",
        body: payload,
      },
    );

    rememberSaveProfile(response.user);
    isSaveLoginOpen.value = false;

    if (shouldSaveAfterAuth.value) {
      shouldSaveAfterAuth.value = false;
      await saveRecordWithSession();
      return;
    }

    saveState.value = "idle";
    saveMessage.value = "Logged in. Your saved records are ready.";
    await loadSavedRecords();
  } catch (error) {
    clearSaveAuth();
    saveState.value = "login-required";
    loginError.value = extractApiError(error, "Unable to login with Telegram or save.");
  }
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
  applyExpenseExample();
}

function reset() {
  rawError.value = "";
  raw.value = "";
  budget.value = createDefaultBudget();
  rangeMode.value = "month";
  rows.value = createDefaultExpenseRows();
  saveState.value = "idle";
  saveMessage.value = "";
  savedRecordId.value = "";
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

function buildInlineShareUrl(payload: string) {
  return `${window.location.origin}${route.path}?s=${encodeURIComponent(payload)}`;
}

onMounted(async () => {
  await restoreSaveSession();

  if (route.query.example === "1") {
    applyExpenseExample(route.query.c === "KHR" ? "KHR" : "USD");
    return;
  }

  const id = route.query.id;

  if (typeof id === "string" && id.trim()) {
    try {
      const response = await $fetch<ExpenseStoredShareResponse>(
        `/api/expense-share/${encodeURIComponent(id.trim())}`,
      );

      applyExpenseSharePayload(parseExpenseSharePayload(response.payload));
    } catch {
      // ignore invalid or expired stored links
    }

    return;
  }

  const s = route.query.s;
  if (typeof s !== "string" || !s.trim()) {
    return;
  }

  try {
    applyExpenseSharePayload(parseExpenseSharePayload(s.trim()));
  } catch {
    // ignore invalid payload
  }
});

watch([isSaveLoginOpen, telegramBotUsername], () => {
  if (isSaveLoginOpen.value) {
    void nextTick(renderTelegramLoginWidget);
  }
});

watch(savedRecordsMonth, () => {
  if (saveProfile.value) {
    void loadSavedRecords();
  }
});

onBeforeUnmount(() => {
  if (copiedTimer) {
    clearTimeout(copiedTimer);
  }

  if (shareTimer) {
    clearShareTimer();
  }

  if (import.meta.client && window.__chlatworkExpenseTelegramLogin) {
    delete window.__chlatworkExpenseTelegramLogin;
  }
});
</script>
