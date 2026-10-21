<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  ArrowUpRight,
  CalendarDays,
  ChartPie,
  ChevronDown,
  ChevronRight,
  ChartNoAxesCombined,
  Database,
  Eye,
  EyeOff,
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
const incomeVisible = defineModel<boolean>("incomeVisible", { default: false });
const netBalanceVisible = defineModel<boolean>("netBalanceVisible", {
  default: false,
});
const metricValueId = useId();

function isMetricVisible(key: string) {
  return key === "income"
    ? incomeVisible.value
    : key === "net"
      ? netBalanceVisible.value
      : true;
}
function toggleMetric(key: string) {
  if (key === "income") incomeVisible.value = !incomeVisible.value;
  if (key === "net") netBalanceVisible.value = !netBalanceVisible.value;
}
const budgetAmountId = useId();
const chartTitleId = useId();
const categorySort = ref("highest");
const showAllCategories = ref(false);
const showAllInsights = ref(false);
const categoryLegendId = useId();
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
      class="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4"
      aria-label="Expense overview totals"
    >
      <section
        v-for="metric in metrics"
        :key="metric.key"
        class="relative min-w-0 items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
        :class="metric.key === 'items' ? 'hidden sm:flex' : 'flex'"
        :aria-label="metric.label"
      >
        <button
          v-if="metric.key === 'income' || metric.key === 'net'"
          type="button"
          :aria-label="`${isMetricVisible(metric.key) ? 'Hide' : 'Show'} ${metric.label.toLowerCase()}`"
          :aria-pressed="isMetricVisible(metric.key)"
          :aria-controls="`${metricValueId}-${metric.key}`"
          class="absolute left-2 top-1.5 flex size-8 shrink-0 items-center justify-center rounded-xl text-sky-600 transition hover:bg-sky-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-cyan-200 dark:hover:bg-cyan-200/10 dark:focus-visible:outline-cyan-200 sm:static sm:size-11 sm:bg-sky-500/10 dark:sm:bg-cyan-200/10"
          @click="toggleMetric(metric.key)"
        >
          <component
            :is="isMetricVisible(metric.key) ? EyeOff : Eye"
            class="size-4 sm:size-5"
            aria-hidden="true"
          />
        </button>
        <span
          v-else
          class="absolute left-3 top-3 flex size-4 shrink-0 items-center justify-center rounded-xl sm:static sm:size-11"
          :class="[metric.surface, metric.tone]"
          ><component
            :is="metric.icon"
            class="size-3.5 sm:size-5"
            aria-hidden="true"
        /></span>
        <div class="min-w-0 flex-1">
          <p
            class="pl-6 text-[11px] font-medium text-slate-500 dark:text-white/55 sm:pl-0 sm:text-sm"
          >
            <span class="sm:hidden">{{
              metric.key === "spent"
                ? "Spent"
                : metric.key === "net"
                  ? "Net"
                  : metric.label
            }}</span
            ><span class="hidden sm:inline">{{ metric.label }}</span>
          </p>
          <p
            :id="`${metricValueId}-${metric.key}`"
            aria-live="polite"
            class="mt-2 min-w-0 max-w-full truncate text-[clamp(0.875rem,4.2vw,1.25rem)] font-black tracking-tight tabular-nums sm:mt-1 sm:text-[clamp(1.35rem,4.8vw,1.85rem)]"
            :class="
              !isMetricVisible(metric.key)
                ? 'text-slate-400 dark:text-white/50'
                : metric.key === 'net'
                  ? metric.tone
                  : ''
            "
          >
            <span
              v-if="!isMetricVisible(metric.key)"
              :aria-label="`${metric.label} hidden`"
              >••••</span
            >
            <span v-else-if="metric.key === 'items'">{{ metric.value }}</span>
            <MoneyAmount v-else :value="metric.value" :currency="currency" />
          </p>
          <p
            class="mt-2 hidden truncate text-xs text-slate-400 dark:text-white/40 sm:block"
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
        <div class="mt-4 grid min-w-0 grid-cols-2 gap-4 sm:block">
          <div class="min-w-0">
            <label
              :for="budgetAmountId"
              class="mb-1.5 block text-xs text-slate-500 dark:text-white/55"
              >Budget amount</label
            >
            <input
              :id="budgetAmountId"
              v-model.trim="budget.amount"
              inputmode="decimal"
              class="h-9 w-full min-w-0 rounded-lg border border-transparent bg-transparent text-xl font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:focus:border-cyan-200 dark:focus:ring-cyan-200/10 sm:h-11 sm:rounded-xl sm:border-slate-200 sm:px-3 sm:text-lg dark:sm:border-white/10"
              placeholder="Enter your budget"
            />
          </div>
          <div
            class="min-w-0 border-l border-slate-100 pl-4 dark:border-white/10 sm:hidden"
          >
            <p class="text-xs text-slate-500 dark:text-white/55">
              {{
                budgetRemaining < 0 && budgetValue ? "Over budget" : "Remaining"
              }}
            </p>
            <p
              class="mt-2 truncate text-xl font-bold"
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
        <div class="mt-4 hidden grid-cols-2 gap-4 sm:grid">
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
            class="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full sm:h-2 bg-slate-100 dark:bg-white/10"
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
        class="hidden sm:block"
        :income-visible="incomeVisible"
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
        class="mt-4 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] items-center gap-3 sm:gap-5 md:grid-cols-[13rem_minmax(0,1fr)]"
      >
        <div
          class="relative mx-auto aspect-square w-full max-w-48 sm:size-52 sm:max-w-none"
        >
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
            class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center sm:px-10"
          >
            <span class="max-w-full truncate text-sm font-black sm:text-xl"
              ><MoneyAmount :value="totalSpent" :currency="currency" /></span
            ><span
              class="mt-1 text-[9px] text-slate-500 dark:text-white/50 sm:text-[11px]"
              >Total spent</span
            >
          </div>
        </div>
        <div class="min-w-0">
          <ul
            :id="categoryLegendId"
            class="grid min-w-0 gap-x-6 lg:grid-cols-2"
          >
            <li
              v-for="(category, index) in sortedCategories"
              :key="category.category"
              class="min-w-0 items-center gap-1.5 border-b border-slate-100 py-2 dark:border-white/[0.06] sm:gap-2.5 sm:py-3"
              :class="
                index >= 5 && !showAllCategories ? 'hidden sm:flex' : 'flex'
              "
            >
              <span
                aria-hidden="true"
                class="h-2.5 w-2.5 shrink-0 rounded-full"
                :style="{ backgroundColor: categoryColor(category) }"
              />
              <span
                :title="category.category"
                class="min-w-0 truncate flex-1 text-[11px] font-medium sm:text-sm"
                >{{ category.category }}</span
              >
              <span
                class="shrink-0 text-[11px] font-semibold tabular-nums sm:text-sm"
                ><MoneyAmount :value="category.total" :currency="currency"
              /></span>
              <span
                class="w-6 shrink-0 text-right text-[10px] text-slate-400 dark:text-white/45 sm:w-10 sm:text-xs"
                >{{ category.percent.toFixed(0) }}%</span
              >
            </li>
          </ul>
          <button
            v-if="categoryBreakdown.length > 5"
            type="button"
            :aria-expanded="showAllCategories"
            :aria-controls="categoryLegendId"
            class="mt-2 flex min-h-9 w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 text-[11px] font-semibold text-sky-700 dark:bg-white/5 dark:text-cyan-200 sm:hidden"
            @click="showAllCategories = !showAllCategories"
          >
            {{
              showAllCategories
                ? "Show fewer categories"
                : "View all categories"
            }}<ChevronRight
              class="size-3.5"
              :class="showAllCategories ? '-rotate-90' : 'rotate-90'"
              aria-hidden="true"
            />
          </button>
        </div>
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
        <div class="flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-base font-bold">
            <Lightbulb
              class="h-5 w-5 text-sky-600 dark:text-cyan-200"
              aria-hidden="true"
            />Insights &amp; tips
          </h3>
          <button
            type="button"
            :aria-expanded="showAllInsights"
            class="flex min-h-9 items-center gap-1 text-xs font-semibold text-sky-700 dark:text-cyan-200 sm:hidden"
            @click="showAllInsights = !showAllInsights"
          >
            {{ showAllInsights ? "Less" : "More"
            }}<ChevronDown
              class="size-3.5"
              :class="showAllInsights ? 'rotate-180' : ''"
              aria-hidden="true"
            />
          </button>
        </div>
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
            class="gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
            :class="
              showAllInsights || !categoryBreakdown.length
                ? 'flex'
                : 'hidden sm:flex'
            "
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
            class="gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
            :class="showAllInsights ? 'flex' : 'hidden sm:flex'"
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
        <p
          class="mt-4 text-xs leading-5 text-slate-400 dark:text-white/40"
          :class="showAllInsights ? 'block' : 'hidden sm:block'"
        >
          Keep categories consistent to make your spending easier to compare.
        </p>
      </section>
    </div>
    <!-- Keep the mobile overview compact while retaining access to the full trend chart. -->
    <details
      class="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:hidden"
    >
      <summary
        class="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"
      >
        <ChartNoAxesCombined
          class="size-4 text-sky-600 dark:text-cyan-200"
          aria-hidden="true"
        />Spending trend<ChevronDown
          class="ml-auto size-4"
          aria-hidden="true"
        />
      </summary>
      <ExpenseSpendingTrend
        class="mt-3 !p-0 !ring-0"
        :income-visible="incomeVisible"
        :data="trendData"
        :from="rangeFrom"
        :to="rangeTo"
        :currency="currency"
      />
    </details>
  </div>
</template>
