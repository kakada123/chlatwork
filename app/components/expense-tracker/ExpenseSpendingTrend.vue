<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { ChartNoAxesCombined } from "lucide-vue-next";
import type { ExpenseCurrency } from "~/lib/expense-tracker";
import { formatExpenseAmountDisplay } from "~/lib/expense-tracker";
import {
  buildExpenseTrendSeries,
  type ExpenseTrendMode,
  type ExpenseTrendPoint,
} from "~/lib/expense-dashboard-view";

const props = withDefaults(
  defineProps<{
    data: ExpenseTrendPoint[];
    from: string;
    to: string;
    currency: ExpenseCurrency;
    incomeVisible?: boolean;
  }>(),
  { incomeVisible: false },
);
const mode = ref<ExpenseTrendMode>("daily");
const modes: ExpenseTrendMode[] = ["daily", "weekly", "monthly"];
const titleId = useId();
watch(
  () => [props.from, props.to],
  () => {
    const days = (Date.parse(props.to) - Date.parse(props.from)) / 86400000;
    mode.value = days > 366 ? "monthly" : days > 62 ? "weekly" : "daily";
  },
  { immediate: true },
);
const series = computed(() =>
  buildExpenseTrendSeries(props.data, props.from, props.to, mode.value),
);
const maxValue = computed(() => {
  const maximum = Math.max(
    1,
    // Income must not affect chart scaling while hidden, which would still reveal its size.
    ...series.value.points.flatMap((point) =>
      props.incomeVisible ? [point.spent, point.income] : [point.spent],
    ),
  );
  const magnitude = 10 ** Math.floor(Math.log10(maximum / 4));
  return Math.ceil(maximum / 4 / magnitude) * magnitude * 4;
});
const x = (index: number) =>
  80 + ((index + 0.5) / Math.max(1, series.value.points.length)) * 620;
const y = (value: number) => 184 - (value / maxValue.value) * 160;
const barWidth = computed(() =>
  Math.min(14, (620 / Math.max(1, series.value.points.length)) * 0.5),
);
const incomePath = computed(() =>
  props.incomeVisible
    ? series.value.points
        .map(
          (point, index) =>
            `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.income)}`,
        )
        .join(" ")
    : "",
);
const ticks = computed(() =>
  [0, 1, 2, 3, 4].map((step) => ({
    value: (maxValue.value / 4) * step,
    y: y((maxValue.value / 4) * step),
  })),
);
const labels = computed(() => {
  const count = Math.min(5, series.value.points.length);
  return [
    ...new Set(
      Array.from({ length: count }, (_, index) =>
        Math.round(
          (index * (series.value.points.length - 1)) / Math.max(1, count - 1),
        ),
      ),
    ),
  ];
});
function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    ...(mode.value === "monthly" ? { year: "2-digit" } : { day: "numeric" }),
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
const moneyLabel = (value: number) =>
  formatExpenseAmountDisplay(value, props.currency).value;
</script>

<template>
  <section
    class="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
    aria-label="Spending trend"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <h3
        class="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"
      >
        <ChartNoAxesCombined
          class="h-5 w-5 text-sky-600 dark:text-cyan-200"
          aria-hidden="true"
        />Spending trend
      </h3>
      <div
        class="flex items-center gap-3 text-xs text-slate-500 dark:text-white/55"
      >
        <span class="inline-flex items-center gap-1.5"
          ><span
            class="h-2 w-2 rounded-full bg-red-400"
            aria-hidden="true"
          />Spent</span
        >
        <span v-if="incomeVisible" class="inline-flex items-center gap-1.5"
          ><span
            class="h-2 w-2 rounded-full bg-green-400"
            aria-hidden="true"
          />Income</span
        >
        <span v-else>Income hidden</span>
      </div>
      <div
        class="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/5"
        role="group"
        aria-label="Trend interval"
      >
        <button
          v-for="interval in modes"
          :key="interval"
          type="button"
          :aria-pressed="mode === interval"
          class="expense-trend-interval min-h-9 rounded-md px-3 text-xs font-semibold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:focus-visible:outline-cyan-200"
          @click="mode = interval"
        >
          {{ interval }}
        </button>
      </div>
    </div>
    <p
      v-if="series.tooManyPoints"
      class="py-10 text-center text-sm text-slate-500 dark:text-white/50"
    >
      Choose a weekly or monthly view, or a shorter date range.
    </p>
    <p
      v-else-if="!data.length"
      class="py-10 text-center text-sm text-slate-500 dark:text-white/50"
    >
      No trend to display for this period.
    </p>
    <template v-else>
      <svg
        viewBox="0 0 720 228"
        role="img"
        :aria-labelledby="titleId"
        class="mt-5 w-full overflow-visible"
      >
        <title :id="titleId">
          {{ mode }} spending trend from {{ from }} to {{ to }}. Bars show
          expenses.
          {{ incomeVisible ? "The line shows income." : "Income is hidden." }}
        </title>
        <g v-for="tick in ticks" :key="tick.value">
          <line
            x1="80"
            x2="700"
            :y1="tick.y"
            :y2="tick.y"
            stroke="currentColor"
            class="text-slate-200 dark:text-white/[0.06]"
          />
          <text
            x="68"
            :y="tick.y + 4"
            text-anchor="end"
            fill="currentColor"
            class="trend-axis text-slate-400 dark:text-white/40"
          >
            {{ moneyLabel(tick.value) }}
          </text>
        </g>
        <g v-for="(point, index) in series.points" :key="point.date">
          <rect
            :x="x(index) - barWidth / 2"
            :y="y(point.spent)"
            :width="barWidth"
            :height="Math.max(0, 184 - y(point.spent))"
            rx="3"
            fill="var(--app-color-danger-bar)"
            opacity="0.85"
          >
            <title>
              {{ dateLabel(point.date) }}: spent
              {{ moneyLabel(point.spent) }}<template v-if="incomeVisible">,
              income {{ moneyLabel(point.income) }}</template>
            </title>
          </rect>
        </g>
        <path
          v-if="incomeVisible"
          :d="incomePath"
          fill="none"
          stroke="var(--app-color-success-bar)"
          stroke-width="2.5"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        />
        <template v-if="incomeVisible && series.points.length <= 62">
          <circle
            v-for="(point, index) in series.points"
            :key="`income-${point.date}`"
            :cx="x(index)"
            :cy="y(point.income)"
            r="3.5"
            fill="var(--app-color-success-bar)"
          />
        </template>
        <text
          v-for="index in labels"
          :key="index"
          :x="x(index)"
          y="215"
          text-anchor="middle"
          fill="currentColor"
          class="trend-axis text-slate-400 dark:text-white/40"
        >
          {{ dateLabel(series.points[index]?.date ?? from) }}
        </text>
      </svg>
      <table class="sr-only">
        <caption>
          Spending trend values
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Spent</th>
            <th v-if="incomeVisible">Income</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in series.points" :key="point.date">
            <th>{{ point.date }}</th>
            <td>{{ moneyLabel(point.spent) }}</td>
            <td v-if="incomeVisible">{{ moneyLabel(point.income) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
/* Own the selected colors so global dark-mode surface overrides cannot erase the active tab. */
.expense-trend-interval {
  color: var(--app-color-muted-text);
}
.expense-trend-interval:hover {
  color: var(--app-color-text);
}
.expense-trend-interval[aria-pressed="true"] {
  background-color: var(--app-color-control-bg);
  color: #0369a1;
}
:global(html.dark .expense-trend-interval[aria-pressed="true"]) {
  background-color: #a5f3fc;
  color: #020617;
}
.trend-axis {
  font-size: 12px;
}
@media (max-width: 639px) {
  .trend-axis {
    font-size: 20px;
  }
}
</style>
