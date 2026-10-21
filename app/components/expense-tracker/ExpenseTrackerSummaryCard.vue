<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  ArrowUpRight,
  CalendarDays,
  ChartPie,
  Database,
  Lightbulb,
  List,
  ShoppingCart,
  Target,
  Wallet,
} from "lucide-vue-next";
import type {
  Breakdown,
  Budget,
  ExpenseBudgetStatus,
  ExpenseCurrency,
} from "~/lib/expense-tracker";
import type { ExpenseTrendPoint } from "~/lib/expense-dashboard-view";
import ExpenseSpendingTrend from "./ExpenseSpendingTrend.vue";

const props = withDefaults(
  defineProps<{
    busy?: boolean;
    currency: ExpenseCurrency;
    rangeLabel: string;
    rangeFrom?: string;
    rangeTo?: string;
    itemsCount: number;
    totalIncome: number;
    totalSpent: number;
    netBalance: number;
    dailyAvg: number;
    budgetValue: number;
    budgetRemaining: number;
    budgetPercent: number;
    budgetStatus: ExpenseBudgetStatus;
    categoryBreakdown: Breakdown[];
    trendData?: ExpenseTrendPoint[];
  }>(),
  { rangeFrom: "", rangeTo: "", trendData: () => [] },
);
const budget = defineModel<Budget>("budget", { required: true });
const budgetAmountId = useId();
const chartTitleId = useId();
const categorySort = ref("highest");
const chartColors = [
  "#0284c7",
  "#7c3aed",
  "#059669",
  "#ea580c",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#4f46e5",
  "#65a30d",
  "#e11d48",
  "#0d9488",
  "#9333ea",
];
const categoryColor = (category: Breakdown) =>
  chartColors[props.categoryBreakdown.indexOf(category) % chartColors.length];
const sortedCategories = computed(() =>
  [...props.categoryBreakdown].sort((a, b) =>
    categorySort.value === "name"
      ? a.category.localeCompare(b.category)
      : categorySort.value === "lowest"
        ? a.total - b.total
        : b.total - a.total,
  ),
);
const categorySlices = computed(() => {
  const total = props.categoryBreakdown.reduce(
    (sum, category) => sum + category.total,
    0,
  );
  let start = -Math.PI / 2;
  return props.categoryBreakdown.map((category, index) => {
    const angle = total > 0 ? (category.total / total) * Math.PI * 2 : 0;
    const end = start + angle;
    const path = `M 100 100 L ${100 + 90 * Math.cos(start)} ${100 + 90 * Math.sin(start)} A 90 90 0 ${angle > Math.PI ? 1 : 0} 1 ${100 + 90 * Math.cos(end)} ${100 + 90 * Math.sin(end)} Z`;
    start = end;
    return {
      category: category.category,
      color: chartColors[index % chartColors.length],
      path,
    };
  });
});
const chartDescription = computed(() =>
  props.categoryBreakdown
    .map((category) => `${category.category}: ${category.percent.toFixed(1)}%`)
    .join(", "),
);
const statusLabel = computed(() =>
  props.budgetStatus.label.replace(/\s*💀$/, ""),
);
const metrics = computed(() => [
  {
    key: "income",
    label: "Income",
    value: props.totalIncome,
    icon: Wallet,
    tone: "text-emerald-600 dark:text-emerald-300",
    surface: "bg-emerald-500/10",
    note: "Received this period",
  },
  {
    key: "spent",
    label: "Total spent",
    value: props.totalSpent,
    icon: ShoppingCart,
    tone: "text-red-500 dark:text-red-300",
    surface: "bg-red-500/10",
    note: "Daily average",
  },
  {
    key: "net",
    label: "Net balance",
    value: props.netBalance,
    icon: Database,
    tone:
      props.netBalance < 0
        ? "text-red-500 dark:text-red-300"
        : "text-sky-600 dark:text-cyan-200",
    surface: "bg-sky-500/10 dark:bg-cyan-200/10",
    note: "Income − spent",
  },
  {
    key: "items",
    label: "Entries",
    value: props.itemsCount,
    icon: List,
    tone: "text-sky-600 dark:text-cyan-200",
    surface: "bg-sky-500/10 dark:bg-cyan-200/10",
    note: "In the selected period",
  },
]);
</script>

<template>
  <div class="min-w-0 space-y-4 text-slate-950 dark:text-white">
    <div
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="Expense overview totals"
    >
      <section
        v-for="metric in metrics"
        :key="metric.key"
        class="flex min-w-0 items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
        :aria-label="metric.label"
      >
        <span
          class="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex"
          :class="[metric.surface, metric.tone]"
          ><component :is="metric.icon" class="h-5 w-5" aria-hidden="true"
        /></span>
        <div class="min-w-0 flex-1">
          <p
            class="text-xs font-medium text-slate-500 dark:text-white/55 sm:text-sm"
          >
            {{ metric.label }}
          </p>
          <p
            class="mt-1 min-w-0 max-w-full truncate text-[clamp(1.35rem,4.8vw,1.85rem)] font-black tracking-tight tabular-nums"
            :class="metric.key === 'net' ? metric.tone : ''"
          >
            <span v-if="metric.key === 'items'">{{ metric.value }}</span>
            <MoneyAmount v-else :value="metric.value" :currency="currency" />
          </p>
          <p
            class="mt-2 truncate text-[11px] text-slate-400 dark:text-white/40 sm:text-xs"
          >
            {{ metric.note
            }}<template v-if="metric.key === 'spent'">
              · <MoneyAmount :value="dailyAvg" :currency="currency"
            /></template>
          </p>
        </div>
      </section>
    </div>

    <div
      class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)]"
    >
      <fieldset
        :disabled="busy"
        class="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
        aria-label="Budget"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold">
            <Target
              class="h-5 w-5 text-sky-600 dark:text-cyan-200"
              aria-hidden="true"
            />Budget
          </h3>
          <select
            v-model="budget.period"
            aria-label="Budget period"
            class="h-9 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold dark:bg-white/5"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <label
          :for="budgetAmountId"
          class="mb-1.5 mt-4 block text-xs text-slate-500 dark:text-white/55"
          >Budget amount</label
        >
        <input
          :id="budgetAmountId"
          v-model.trim="budget.amount"
          inputmode="decimal"
          class="h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-lg font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-white/10 dark:focus:border-cyan-200 dark:focus:ring-cyan-200/10"
          placeholder="Enter your budget"
        />
        <div class="mt-4 grid grid-cols-2 gap-4">
          <div class="min-w-0">
            <p class="text-xs text-slate-500 dark:text-white/55">Spent</p>
            <p class="mt-1 truncate text-xl font-bold">
              <MoneyAmount :value="totalSpent" :currency="currency" />
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-xs text-slate-500 dark:text-white/55">
              {{
                budgetRemaining < 0 && budgetValue ? "Over budget" : "Remaining"
              }}
            </p>
            <p
              class="mt-1 truncate text-xl font-bold"
              :class="
                budgetRemaining < 0
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-emerald-600 dark:text-emerald-300'
              "
            >
              <MoneyAmount
                v-if="budgetValue"
                :value="Math.abs(budgetRemaining)"
                :currency="currency"
              /><span v-else>—</span>
            </p>
          </div>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <div
            role="progressbar"
            aria-label="Budget used"
            :aria-valuenow="Math.min(100, Math.max(0, budgetPercent))"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuetext="
              budgetValue ? budgetPercent + '% of budget used' : 'No budget set'
            "
            class="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
          >
            <div
              class="h-full rounded-full transition-all"
              :class="budgetStatus.bar"
              :style="{
                width: Math.min(100, Math.max(0, budgetPercent)) + '%',
              }"
            />
          </div>
          <span class="text-xs font-bold tabular-nums"
            >{{ budgetPercent }}%</span
          >
        </div>
        <div
          class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <span :class="budgetStatus.text">{{ statusLabel }}</span
          ><span class="text-slate-400 dark:text-white/40"
            >For the selected date range</span
          >
        </div>
      </fieldset>
      <ExpenseSpendingTrend
        :data="trendData"
        :from="rangeFrom"
        :to="rangeTo"
        :currency="currency"
      />
    </div>

    <section
      class="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
      aria-label="Spending by category"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="flex items-center gap-2 text-base font-bold">
          <ChartPie
            class="h-5 w-5 text-sky-600 dark:text-cyan-200"
            aria-hidden="true"
          />Spending by category
        </h3>
        <select
          v-model="categorySort"
          aria-label="Sort categories"
          class="h-9 rounded-lg bg-slate-100 px-2.5 text-xs font-semibold dark:bg-white/5"
        >
          <option value="highest">Highest first</option>
          <option value="lowest">Lowest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
      <div
        v-if="categoryBreakdown.length"
        class="mt-4 grid items-center gap-5 md:grid-cols-[13rem_minmax(0,1fr)]"
      >
        <div class="relative mx-auto h-48 w-48 sm:h-52 sm:w-52">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label="Category breakdown chart"
            :aria-labelledby="chartTitleId"
            class="h-full w-full"
          >
            <title :id="chartTitleId">
              Spending by category donut chart. {{ chartDescription }}
            </title>
            <circle
              v-if="categorySlices.length === 1"
              cx="100"
              cy="100"
              r="90"
              :fill="categorySlices[0]?.color"
            />
            <template v-else>
              <path
                v-for="slice in categorySlices"
                :key="slice.category"
                :d="slice.path"
                :fill="slice.color"
              />
            </template>
            <circle
              cx="100"
              cy="100"
              r="59"
              class="fill-white dark:fill-[#101214]"
            />
          </svg>
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center"
          >
            <span class="max-w-full truncate text-xl font-black"
              ><MoneyAmount :value="totalSpent" :currency="currency" /></span
            ><span class="mt-1 text-[11px] text-slate-500 dark:text-white/50"
              >Total spent</span
            >
          </div>
        </div>
        <ul class="grid min-w-0 gap-x-6 sm:grid-cols-2">
          <li
            v-for="category in sortedCategories"
            :key="category.category"
            class="flex min-w-0 items-center gap-2.5 border-b border-slate-100 py-3 dark:border-white/[0.06]"
          >
            <span
              aria-hidden="true"
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :style="{ backgroundColor: categoryColor(category) }"
            />
            <span
              :title="category.category"
              class="min-w-0 truncate flex-1 text-sm font-medium"
              >{{ category.category }}</span
            >
            <span class="shrink-0 text-sm font-semibold tabular-nums"
              ><MoneyAmount :value="category.total" :currency="currency"
            /></span>
            <span
              class="w-10 shrink-0 text-right text-xs text-slate-400 dark:text-white/45"
              >{{ category.percent.toFixed(0) }}%</span
            >
          </li>
        </ul>
      </div>
      <p v-else class="py-6 text-sm text-slate-500 dark:text-white/50">
        Add expenses to see spending by category.
      </p>
    </section>

    <div
      class="grid min-w-0 items-start gap-4"
      :class="
        $slots.entries ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]' : ''
      "
    >
      <slot name="entries" />
      <section
        class="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
        aria-label="Expense insights"
      >
        <h3 class="flex items-center gap-2 text-base font-bold">
          <Lightbulb
            class="h-5 w-5 text-sky-600 dark:text-cyan-200"
            aria-hidden="true"
          />Insights &amp; tips
        </h3>
        <div class="mt-4 space-y-3">
          <div
            v-if="categoryBreakdown.length"
            class="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-cyan-200/10 dark:text-cyan-200"
              ><ArrowUpRight class="h-4 w-4" aria-hidden="true"
            /></span>
            <div class="min-w-0">
              <h4 class="text-sm font-semibold">
                Biggest category: {{ categoryBreakdown[0]?.category }}
              </h4>
              <p
                class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55"
              >
                <MoneyAmount
                  :value="categoryBreakdown[0]?.total ?? 0"
                  :currency="currency"
                />
                spent · {{ categoryBreakdown[0]?.percent.toFixed(0) }}% of this
                period.
              </p>
            </div>
          </div>
          <div
            class="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
              ><Target class="h-4 w-4" aria-hidden="true"
            /></span>
            <div>
              <h4 class="text-sm font-semibold">
                {{ budgetValue ? statusLabel : "Set your budget" }}
              </h4>
              <p
                class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/55"
              >
                <template v-if="budgetValue"
                  ><MoneyAmount
                    :value="Math.abs(budgetRemaining)"
                    :currency="currency"
                  />
                  {{
                    budgetRemaining < 0
                      ? "over your budget."
                      : "left in your budget."
                  }}</template
                ><template v-else
                  >Add a budget amount to track your spending.</template
                >
              </p>
            </div>
          </div>
          <div
            class="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
          >
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 dark:bg-cyan-200/10 dark:text-cyan-200"
              ><CalendarDays class="h-4 w-4" aria-hidden="true"
            /></span>
            <div>
              <h4 class="text-sm font-semibold">Average daily spending</h4>
              <p class="mt-1 text-xs text-slate-500 dark:text-white/55">
                <MoneyAmount :value="dailyAvg" :currency="currency" /> per day
                in this date range.
              </p>
            </div>
          </div>
        </div>
        <p class="mt-4 text-xs leading-5 text-slate-400 dark:text-white/40">
          Keep categories consistent to make your spending easier to compare.
        </p>
      </section>
    </div>
  </div>
</template>
