<template>
  <div class="mx-auto max-w-5xl">
    <!-- ✅ Header -->
    <div
      class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
    >
      <div>
        <h1 class="text-xl font-bold leading-tight">Expense Tracker</h1>
        <p class="mt-2 max-w-xl text-gray-600">
          Track your spending with budget + insights. No signup, just vibes.
        </p>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          class="w-full sm:w-auto px-4 py-2 rounded-lg bg-white border hover:bg-gray-100"
          @click="reset"
          type="button"
        >
          Reset
        </button>

        <!-- Share link -->
        <button
          class="w-full sm:w-auto px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 inline-flex items-center justify-center gap-2"
          @click="shareLink"
          :aria-label="shareCopied ? 'Link copied' : 'Share link'"
          type="button"
        >
          <svg
            v-if="!shareCopied"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="w-4 h-4"
          >
            <path
              fill="currentColor"
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a2.5 2.5 0 0 0 0-1.39l7-4.11A2.99 2.99 0 1 0 14 5a2.9 2.9 0 0 0 .05.52l-7 4.11a3 3 0 1 0 0 4.74l7.05 4.11c-.03.17-.05.34-.05.52a3 3 0 1 0 3-2.92Z"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            class="w-4 h-4"
          >
            <path
              fill="currentColor"
              d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
            />
          </svg>

          <span class="text-sm font-medium">
            {{ shareCopied ? "Link copied" : "Share link" }}
          </span>
        </button>
      </div>
    </div>

    <!-- ✅ 1 column layout: Input first, Summary at bottom -->
    <div class="grid grid-cols-1 gap-4">
      <!-- Input -->
      <div class="bg-white rounded-xl border p-4">
        <div class="flex items-center justify-between mb-2">
          <h2 class="font-semibold">Input</h2>

          <div class="flex items-center gap-2">
            <select
              v-model="currency"
              class="text-sm border rounded-lg px-2 py-1"
            >
              <option value="USD">USD</option>
              <option value="KHR">KHR</option>
            </select>

            <select
              v-model="rangeMode"
              class="text-sm border rounded-lg px-2 py-1"
            >
              <option value="all">All</option>
              <option value="month">This month</option>
              <option value="week">Last 7 days</option>
              <option value="today">Today</option>
            </select>
          </div>
        </div>

        <!-- ✅ Quick category chips (smaller) -->
        <div class="mb-3 flex flex-wrap gap-2">
          <button
            v-for="c in presetCategories"
            :key="c"
            class="px-2.5 py-1 rounded-full border bg-white text-xs hover:bg-gray-50 active:scale-[0.99]"
            @click="quickAdd(c)"
            type="button"
          >
            {{ c }}
          </button>
        </div>

        <!-- ✅ Mobile: Card rows (compact, note always visible) -->
        <div class="md:hidden space-y-3">
          <div v-for="(r, i) in rows" :key="i" class="border rounded-xl p-3">
            <div class="grid grid-cols-1 gap-2">
              <div>
                <div class="text-xs text-gray-500 mb-1">Date</div>
                <input
                  v-model="r.date"
                  type="date"
                  class="h-10 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <div class="text-xs text-gray-500 mb-1">Category</div>
                <select
                  v-model="r.category"
                  class="h-10 w-full text-sm border rounded-lg px-3 bg-white outline-none focus:ring-2 focus:ring-black/10"
                >
                  <option v-for="c in presetCategories" :key="c" :value="c">
                    {{ c }}
                  </option>
                  <option value="__custom__">Custom…</option>
                </select>

                <input
                  v-if="r.category === '__custom__'"
                  v-model.trim="r.customCategory"
                  class="mt-2 h-10 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="Type category..."
                />
              </div>

              <div>
                <div class="text-xs text-gray-500 mb-1">Note</div>
                <input
                  v-model.trim="r.note"
                  class="h-10 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="Optional note..."
                />
              </div>

              <div>
                <div class="text-xs text-gray-500 mb-1">Amount</div>
                <input
                  v-model.trim="r.amount"
                  inputmode="decimal"
                  class="h-10 w-full text-sm text-right border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="0"
                />
              </div>
            </div>

            <div class="mt-3 flex justify-end">
              <button
                class="px-3 py-2 rounded-lg border hover:bg-gray-100 text-sm"
                @click="removeRow(i)"
                type="button"
              >
                ✕ Remove
              </button>
            </div>
          </div>

          <div
            v-if="rows.length === 0"
            class="p-3 text-sm text-gray-500 border rounded-xl"
          >
            No rows yet. Click “Add row”.
          </div>
        </div>

        <!-- ✅ Desktop: Table (compact like PayBack, no scroll, note visible) -->
        <div class="hidden md:block border rounded-xl overflow-hidden">
          <table class="w-full table-fixed text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left p-2 w-[22%]">Date</th>
                <th class="text-left p-2 w-[22%]">Category</th>
                <th class="text-left p-2 w-[36%]">Note</th>
                <th class="text-right p-2 w-[20%]">Amount</th>
                <th class="p-2 w-[72px]"></th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(r, i) in rows" :key="i" class="border-t align-top">
                <!-- Date -->
                <td class="p-2">
                  <input
                    v-model="r.date"
                    type="date"
                    class="h-11 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                  />
                </td>

                <!-- Category -->
                <td class="p-2">
                  <select
                    v-model="r.category"
                    class="h-11 w-full text-sm border rounded-lg px-3 bg-white outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option v-for="c in presetCategories" :key="c" :value="c">
                      {{ c }}
                    </option>
                    <option value="__custom__">Custom…</option>
                  </select>

                  <input
                    v-if="r.category === '__custom__'"
                    v-model.trim="r.customCategory"
                    class="mt-2 h-11 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="Type category..."
                  />
                </td>

                <!-- Note -->
                <td class="p-2">
                  <input
                    v-model.trim="r.note"
                    class="h-11 w-full text-sm border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="Optional note..."
                  />
                </td>

                <!-- Amount -->
                <td class="p-2">
                  <input
                    v-model.trim="r.amount"
                    inputmode="decimal"
                    class="h-11 w-full text-sm text-right border rounded-lg px-3 outline-none focus:ring-2 focus:ring-black/10"
                    placeholder="0"
                  />
                </td>

                <!-- Remove (✅ fixed spacing from table edge) -->
                <td class="p-2 pr-3">
                  <div class="flex justify-end">
                    <button
                      class="h-11 w-11 rounded-lg border hover:bg-gray-100 text-base leading-none"
                      @click="removeRow(i)"
                      :aria-label="`Remove row ${i + 1}`"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="rows.length === 0">
                <td class="p-3 text-gray-500" colspan="5">
                  No rows yet. Click “Add row”.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button
            class="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap hover:bg-gray-50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            @click="addRow()"
            type="button"
          >
            <span class="text-base leading-none">＋</span>
            <span class="truncate">Add row</span>
          </button>

          <button
            class="h-11 rounded-lg bg-black text-white px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            @click="loadExample"
            type="button"
          >
            <span class="truncate">Load example</span>
          </button>

          <button
            class="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap hover:bg-gray-50 active:scale-[0.99] disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10"
            @click="copySummary"
            :disabled="filteredExpenses.length === 0"
            type="button"
          >
            <svg
              v-if="!copied"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
            >
              <path
                fill="currentColor"
                d="M16 1H6a2 2 0 0 0-2 2v12h2V3h10V1Zm3 4H10a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H10V7h9v14Z"
              />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="w-4 h-4"
            >
              <path
                fill="currentColor"
                d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
              />
            </svg>

            <span class="truncate">{{ copied ? "Copied" : "Copy" }}</span>
          </button>
        </div>

        <!-- Paste mode -->
        <details class="mt-4">
          <summary
            class="cursor-pointer text-sm text-gray-600 hover:text-gray-900"
          >
            Paste mode (optional)
          </summary>

          <textarea
            v-model="raw"
            class="mt-2 w-full h-44 border rounded-xl p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/10"
            placeholder="Format:
2026-01-29, Food, lunch, 3.5
2026-01-29, Coffee, latte, 2.0

(Comma or tab supported)"
          />

          <div class="mt-2 flex gap-2">
            <button
              class="px-4 py-2 rounded-lg bg-white border hover:bg-gray-100"
              @click="applyRaw"
              type="button"
            >
              Apply paste to rows
            </button>
          </div>
        </details>

        <p v-if="error" class="text-sm text-red-600 mt-3">{{ error }}</p>
      </div>

      <!-- Summary (bottom) -->
      <div class="bg-white rounded-xl border p-4">
        <div class="flex items-center justify-between gap-3 mb-2">
          <h2 class="font-semibold">Summary</h2>

          <!-- ✅ compact badges to reduce scrolling + give quick context -->
          <div class="flex flex-wrap justify-end gap-2">
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
            >
              Range:
              <span class="ml-1 font-mono">{{ rangeLabel }}</span>
            </span>

            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs bg-white"
            >
              Top:
              <span class="ml-1 font-semibold">
                {{ categoryBreakdown[0]?.category ?? "—" }}
              </span>
            </span>

            <span
              class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
              :class="budgetValue ? budgetStatus.bg : 'bg-white'"
            >
              {{ budgetValue ? budgetStatus.label : "Set budget" }}
            </span>
          </div>
        </div>

        <!-- Cards (✅ 2 cols on mobile, 4 on desktop) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Items</div>
            <div class="text-lg font-bold">{{ filteredExpenses.length }}</div>
          </div>

          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Total</div>
            <div class="text-lg font-bold">{{ fmt(totalSpent) }}</div>
          </div>

          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Daily avg</div>
            <div class="text-lg font-bold">{{ fmt(dailyAvg) }}</div>
          </div>

          <div class="rounded-xl bg-gray-50 border p-3">
            <div class="text-xs text-gray-500">Budget used</div>
            <div class="text-lg font-bold">
              {{ budgetValue ? `${budgetPercent}%` : "—" }}
            </div>
            <div class="mt-1">
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-xs border"
                :class="budgetValue ? budgetStatus.bg : 'bg-white'"
              >
                {{ budgetValue ? budgetStatus.label : "Set budget" }}
              </span>
            </div>
          </div>
        </div>

        <!-- ✅ Budget + Insights side-by-side on large screens (less scroll) -->
        <div class="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Budget -->
          <div class="border rounded-xl p-3">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-semibold">Budget</h3>

              <select
                v-model="budget.period"
                class="text-sm border rounded-lg px-2 py-1"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div class="text-xs text-gray-500 mb-1">Budget amount</div>
                <input
                  v-model.trim="budget.amount"
                  inputmode="decimal"
                  class="h-12 w-full text-base border rounded-lg px-4 outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="e.g. 200"
                />
              </div>

              <div>
                <div class="text-xs text-gray-500 mb-1">Remaining</div>
                <div
                  class="h-12 w-full border rounded-lg px-4 flex items-center font-semibold"
                  :class="budgetStatus.bg"
                >
                  {{ fmt(budgetRemaining) }}
                  <span
                    class="ml-2 text-xs font-medium"
                    :class="budgetStatus.text"
                  >
                    {{ budgetStatus.label }}
                  </span>
                </div>
              </div>
            </div>

            <div class="mt-3">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>Spent</span>
                <span>{{ budgetPercent }}%</span>
              </div>

              <div class="h-2 rounded-full bg-gray-100 overflow-hidden border">
                <div
                  class="h-2 rounded-full"
                  :class="budgetStatus.bar"
                  :style="{
                    width: `${Math.min(100, Math.max(0, budgetPercent))}%`,
                  }"
                />
              </div>

              <p class="mt-2 text-xs text-gray-500">
                Budget uses the selected range:
                <span class="font-mono">{{ rangeLabel }}</span
                >.
              </p>
            </div>
          </div>

          <!-- Insights -->
          <div class="border rounded-xl p-3 bg-gray-50">
            <h3 class="font-semibold mb-1">Insights</h3>
            <ul class="text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li v-for="(msg, i) in insights" :key="i">{{ msg }}</li>
              <li v-if="insights.length === 0" class="text-gray-500">
                No insights yet.
              </li>
            </ul>
          </div>
        </div>

        <!-- Breakdown -->
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">Category breakdown</h3>
            <span class="text-xs text-gray-500">
              {{ categoryBreakdown.length ? "Top first" : "" }}
            </span>
          </div>

          <div class="overflow-auto border rounded-xl">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left p-2">Category</th>
                  <th class="text-right p-2">Total</th>
                  <th class="text-right p-2">%</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in categoryBreakdown"
                  :key="c.category"
                  class="border-t"
                >
                  <td class="p-2 font-medium">{{ c.category }}</td>
                  <td class="p-2 text-right">{{ fmt(c.total) }}</td>
                  <td class="p-2 text-right">{{ c.percent.toFixed(0) }}%</td>
                </tr>

                <tr v-if="categoryBreakdown.length === 0">
                  <td class="p-3 text-gray-500" colspan="3">No data yet.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top expenses -->
        <div class="mt-4">
          <h3 class="font-semibold mb-2">Top expenses</h3>

          <ul v-if="topExpenses.length" class="space-y-2">
            <li
              v-for="(t, i) in topExpenses"
              :key="i"
              class="flex items-center justify-between gap-3 border rounded-xl p-3 bg-gray-50"
            >
              <div class="text-sm min-w-0">
                <div class="font-semibold">{{ t.category }}</div>
                <div class="text-xs text-gray-500 truncate">
                  {{ t.date }} • {{ t.note || "—" }}
                </div>
              </div>
              <div class="font-bold shrink-0">{{ fmt(t.amount) }}</div>
            </li>
          </ul>

          <div v-else class="text-sm text-gray-500">
            Add expenses to see top spending.
          </div>
        </div>

        <p class="text-xs text-gray-500 mt-4">
          Tip: keep categories consistent (Food vs food). Your future self will
          thank you 😄
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type ExpenseRow = {
  date: string; // YYYY-MM-DD
  category: string; // preset name or "__custom__"
  customCategory?: string; // if category="__custom__"
  note: string;
  showNote?: boolean;
  amount: string; // string for input UX
};

type Budget = {
  period: "monthly" | "weekly";
  amount: string;
};

type Breakdown = {
  category: string;
  total: number;
  percent: number;
};

const route = useRoute();
const router = useRouter();

// ✅ SEO
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

// ---------- UI state ----------
const copied = ref(false);
const shareCopied = ref(false);

let copiedTimer: ReturnType<typeof setTimeout> | null = null;
let shareTimer: ReturnType<typeof setTimeout> | null = null;

function flashCopied(ms = 1500) {
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => {
    copied.value = false;
    copiedTimer = null;
  }, ms);
}

function flashShareCopied(ms = 1500) {
  shareCopied.value = true;
  if (shareTimer) clearTimeout(shareTimer);
  shareTimer = setTimeout(() => {
    shareCopied.value = false;
    shareTimer = null;
  }, ms);
}

// ---------- Core ----------
const currency = ref<"USD" | "KHR">("USD");
const rangeMode = ref<"all" | "month" | "week" | "today">("month");

const budget = ref<Budget>({
  period: "monthly",
  amount: "",
});

const raw = ref("");
const error = ref("");

// ✅ Default categories (short + useful)
const presetCategories = [
  "Food",
  "Coffee",
  "Transport",
  "Rent",
  "Bills",
  "Internet",
  "Shopping",
  "Health",
  "Entertainment",
  "Other",
];

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const rows = ref<ExpenseRow[]>([
  { date: todayISO(), category: "Food", note: "", amount: "", showNote: false },
  {
    date: todayISO(),
    category: "Coffee",
    note: "",
    amount: "",
    showNote: false,
  },
]);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fmt(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (currency.value === "KHR") {
    return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}៛`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

function parseAmount(input: string): number {
  const cleaned = (input ?? "").trim().replace(/\$/g, "").replace(/៛/g, "");
  const n = Number(cleaned);
  if (Number.isNaN(n)) throw new Error("Invalid amount.");
  return n;
}

function resolveCategory(r: ExpenseRow): string {
  const c = (r.category ?? "").trim();
  if (c === "__custom__") return (r.customCategory ?? "").trim();
  return c;
}

function normalizeCategoryToRow(categoryRaw: string): {
  category: string;
  customCategory?: string;
} {
  const c = (categoryRaw ?? "").trim();
  if (!c) return { category: "" };

  const matchPreset = presetCategories.find(
    (x) => x.toLowerCase() === c.toLowerCase(),
  );
  if (matchPreset) return { category: matchPreset };

  return { category: "__custom__", customCategory: c };
}

function addRow() {
  rows.value.push({
    date: todayISO(),
    category: "Food",
    note: "",
    amount: "",
    showNote: false,
  });
}

function quickAdd(cat: string) {
  rows.value.push({
    date: todayISO(),
    category: cat,
    note: "",
    amount: "",
    showNote: false,
  });
}

function removeRow(i: number) {
  rows.value.splice(i, 1);
}

// ---------- Range filtering ----------
function startOfMonthISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function isoToDate(s: string) {
  const [y, m, d] = (s || "").split("-").map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

const rangeLabel = computed(() => {
  if (rangeMode.value === "all") return "All";
  if (rangeMode.value === "month") return "This month";
  if (rangeMode.value === "week") return "Last 7 days";
  return "Today";
});

const filteredExpenses = computed(() => {
  error.value = "";

  const out: Array<{
    date: string;
    category: string;
    note: string;
    amount: number;
  }> = [];

  for (const r of rows.value) {
    const date = (r.date ?? "").trim();
    const category = resolveCategory(r);
    const note = (r.note ?? "").trim();
    const amtRaw = (r.amount ?? "").trim();

    // ignore empty row
    const hasAny =
      date || category || note || amtRaw || (r.customCategory ?? "").trim();
    if (!hasAny) continue;

    if (!date) {
      error.value = "Missing date in a row.";
      continue;
    }
    if (!category) {
      error.value = "Missing category in a row.";
      continue;
    }
    if (!amtRaw) {
      error.value = `Missing amount for "${category}".`;
      continue;
    }

    let amount = 0;
    try {
      amount = parseAmount(amtRaw);
    } catch (e: any) {
      error.value = e?.message || "Invalid amount";
      continue;
    }

    out.push({ date, category, note, amount: round2(amount) });
  }

  if (rangeMode.value === "all") return out;

  const now = new Date();
  const today = todayISO();
  const monthStart = startOfMonthISO();
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - 6); // inclusive 7 days
  const weekStartISO = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(
    weekStartDate.getDate(),
  ).padStart(2, "0")}`;

  return out.filter((x) => {
    if (rangeMode.value === "today") return x.date === today;
    if (rangeMode.value === "month") return x.date >= monthStart;
    if (rangeMode.value === "week") return x.date >= weekStartISO;
    return true;
  });
});

// ---------- Summary numbers ----------
const totalSpent = computed(() =>
  round2(filteredExpenses.value.reduce((s, x) => s + x.amount, 0)),
);

const dateSpanDays = computed(() => {
  const list = filteredExpenses.value;
  if (!list.length) return 0;

  const dates = list
    .map((x) => x.date)
    .filter(Boolean)
    .sort();

  const min = isoToDate(dates[0]);
  const max = isoToDate(dates[dates.length - 1]);
  if (!min || !max) return 1;

  const diff = Math.floor(
    (max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, diff + 1);
});

const dailyAvg = computed(() => {
  if (!filteredExpenses.value.length) return 0;
  return round2(totalSpent.value / dateSpanDays.value);
});

// ---------- Budget logic ----------
const budgetValue = computed(() => {
  const rawVal = (budget.value.amount ?? "").trim();
  if (!rawVal) return 0;
  try {
    return Math.max(0, parseAmount(rawVal));
  } catch {
    return 0;
  }
});

const budgetRemaining = computed(() =>
  round2(budgetValue.value - totalSpent.value),
);

const budgetPercent = computed(() => {
  if (!budgetValue.value) return 0;
  return Math.round((totalSpent.value / budgetValue.value) * 100);
});

const budgetStatus = computed(() => {
  const b = budgetValue.value;
  if (!b) {
    return {
      label: "Set budget",
      text: "text-gray-600",
      bg: "bg-white",
      bar: "bg-gray-300",
    };
  }

  const remaining = budgetRemaining.value;
  const ratio = remaining / b;

  if (remaining < 0) {
    return {
      label: "Over budget 💀",
      text: "text-red-700",
      bg: "bg-red-50 border-red-200",
      bar: "bg-red-500",
    };
  }
  if (ratio <= 0.1) {
    return {
      label: "Bro stop 😭",
      text: "text-red-700",
      bg: "bg-red-50 border-red-200",
      bar: "bg-red-500",
    };
  }
  if (ratio <= 0.3) {
    return {
      label: "Careful 🟡",
      text: "text-yellow-700",
      bg: "bg-yellow-50 border-yellow-200",
      bar: "bg-yellow-500",
    };
  }
  return {
    label: "Safe ✅",
    text: "text-green-700",
    bg: "bg-green-50 border-green-200",
    bar: "bg-green-500",
  };
});

// ---------- Breakdown ----------
const categoryBreakdown = computed<Breakdown[]>(() => {
  const list = filteredExpenses.value;
  if (!list.length) return [];

  const map = new Map<string, number>();
  for (const x of list) {
    map.set(x.category, round2((map.get(x.category) || 0) + x.amount));
  }

  const total = totalSpent.value || 1;

  return [...map.entries()]
    .map(([category, sum]) => ({
      category,
      total: sum,
      percent: (sum / total) * 100,
    }))
    .sort((a, b) => b.total - a.total);
});

const topExpenses = computed(() =>
  [...filteredExpenses.value].sort((a, b) => b.amount - a.amount).slice(0, 5),
);

// ---------- Insights ----------
const insights = computed(() => {
  const list = filteredExpenses.value;
  if (!list.length) return [];

  const msgs: string[] = [];

  const biggest = categoryBreakdown.value[0];
  if (biggest) {
    const pct = Math.round(biggest.percent);
    msgs.push(`Biggest category: ${biggest.category} (${pct}%).`);
  }

  const top = topExpenses.value[0];
  if (top) {
    msgs.push(`Top expense: ${top.category} — ${fmt(top.amount)}.`);
  }

  if (budgetValue.value) {
    if (budgetRemaining.value < 0) {
      msgs.push(
        `You exceeded your budget by ${fmt(Math.abs(budgetRemaining.value))}.`,
      );
    } else {
      msgs.push(`Remaining budget: ${fmt(budgetRemaining.value)}.`);
    }

    if (dailyAvg.value > 0) {
      const daysLeft = Math.floor(
        Math.max(0, budgetRemaining.value) / dailyAvg.value,
      );
      if (budgetRemaining.value > 0)
        msgs.push(`At this pace, budget lasts about ${daysLeft} day(s).`);
    }
  } else {
    msgs.push("Set a budget to unlock the spicy warnings 😄");
  }

  return msgs;
});

// ---------- Paste parsing ----------
function applyRaw() {
  error.value = "";
  if (!raw.value.trim()) return;

  try {
    const lines = raw.value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const next: ExpenseRow[] = [];

    for (const line of lines) {
      const parts = line.split(/\t|,/).map((x) => x.trim());
      if (parts.length < 4) throw new Error(`Invalid line: "${line}"`);

      const date = parts[0];
      const catRaw = parts[1];
      const note = parts[2];
      const amount = parts.slice(3).join(" ").trim();

      const normalized = normalizeCategoryToRow(catRaw);

      next.push({
        date,
        category: normalized.category,
        customCategory: normalized.customCategory,
        note,
        showNote: false,
        amount,
      });
    }

    rows.value = next.length
      ? next
      : [
          {
            date: todayISO(),
            category: "Food",
            note: "",
            amount: "",
            showNote: false,
          },
        ];
  } catch (e: any) {
    error.value = e?.message || "Invalid paste input";
  }
}

// ---------- Share payload ----------
function buildSharePayload() {
  const payload = {
    c: currency.value,
    r: rangeMode.value,
    b: budget.value,
    t: raw.value,
    rows: rows.value,
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return b64;
}

function readSharePayload(b64: string) {
  const padded =
    b64.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - (b64.length % 4)) % 4);

  const json = decodeURIComponent(escape(atob(padded)));
  const payload = JSON.parse(json) as {
    c?: "USD" | "KHR";
    r?: "all" | "month" | "week" | "today";
    b?: Budget;
    t?: string;
    rows?: ExpenseRow[];
  };

  if (payload.c) currency.value = payload.c;
  if (payload.r) rangeMode.value = payload.r;
  if (payload.b) budget.value = payload.b;
  if (typeof payload.t === "string") raw.value = payload.t;

  if (Array.isArray(payload.rows)) {
    // ✅ Backward-safe: ensure new fields exist
    rows.value = payload.rows.map((x) => ({
      date: x.date ?? todayISO(),
      category: x.category ?? "Food",
      customCategory: x.customCategory,
      note: x.note ?? "",
      showNote: x.showNote ?? false,
      amount: x.amount ?? "",
    }));
  }
}

async function shareLink() {
  const s = buildSharePayload();
  await router.replace({ query: { s } });

  const url = `${window.location.origin}${route.path}?s=${encodeURIComponent(s)}`;
  await navigator.clipboard.writeText(url);
  flashShareCopied();
}

async function copySummary() {
  if (!filteredExpenses.value.length) return;

  const lines: string[] = [];
  lines.push(`Expense Tracker (${rangeLabel.value})`);
  lines.push(`Items: ${filteredExpenses.value.length}`);
  lines.push(`Total: ${fmt(totalSpent.value)}`);
  lines.push(`Daily avg: ${fmt(dailyAvg.value)}`);

  if (budgetValue.value) {
    lines.push(`Budget (${budget.value.period}): ${fmt(budgetValue.value)}`);
    lines.push(
      `Remaining: ${fmt(budgetRemaining.value)} (${budgetPercent.value}%)`,
    );
  }

  lines.push("");
  lines.push("Top categories:");
  for (const c of categoryBreakdown.value.slice(0, 5)) {
    lines.push(`- ${c.category}: ${fmt(c.total)} (${Math.round(c.percent)}%)`);
  }

  await navigator.clipboard.writeText(lines.join("\n"));
  flashCopied();
}

// ---------- Example / Reset ----------
function loadExample() {
  const t = todayISO();
  rows.value = [
    {
      date: t,
      category: "Food",
      note: "Lunch",
      amount: "4.5",
      showNote: false,
    },
    {
      date: t,
      category: "Coffee",
      note: "Latte",
      amount: "2.0",
      showNote: false,
    },
    {
      date: t,
      category: "Transport",
      note: "Tuk tuk",
      amount: "1.5",
      showNote: false,
    },
    {
      date: t,
      category: "Rent",
      note: "Monthly",
      amount: "100",
      showNote: false,
    },
    {
      date: t,
      category: "__custom__",
      customCategory: "Gym",
      note: "",
      amount: "15",
      showNote: false,
    },
  ];
  budget.value = { period: "monthly", amount: "200" };
  rangeMode.value = "month";
  raw.value = `2026-01-29, Food, lunch, 4.5
2026-01-29, Coffee, latte, 2.0
2026-01-29, Transport, tuk tuk, 1.5
2026-01-29, Rent, monthly, 100
2026-01-29, Gym, , 15`;
}

function reset() {
  error.value = "";
  raw.value = "";
  budget.value = { period: "monthly", amount: "" };
  rangeMode.value = "month";
  rows.value = [
    {
      date: todayISO(),
      category: "Food",
      note: "",
      amount: "",
      showNote: false,
    },
    {
      date: todayISO(),
      category: "Coffee",
      note: "",
      amount: "",
      showNote: false,
    },
  ];
}

onMounted(() => {
  const s = route.query.s;
  if (typeof s === "string" && s.trim()) {
    try {
      readSharePayload(s.trim());
    } catch {
      // ignore invalid payload
    }
  }
});
</script>
