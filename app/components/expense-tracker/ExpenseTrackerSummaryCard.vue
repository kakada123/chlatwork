<script setup lang="ts">
import type {
  Breakdown,
  Budget,
  ExpenseBudgetStatus,
  ExpenseCurrency,
  ExpenseInsight,
} from "~/lib/expense-tracker";

const props = defineProps<{
  currency: ExpenseCurrency;
  rangeLabel: string;
  itemsCount: number;
  totalIncome: number;
  totalSpent: number;
  netBalance: number;
  dailyAvg: number;
  budgetValue: number;
  budgetRemaining: number;
  budgetPercent: number;
  budgetStatus: ExpenseBudgetStatus;
  insights: ExpenseInsight[];
  categoryBreakdown: Breakdown[];
}>();

const budget = defineModel<Budget>("budget", { required: true });
const budgetAmountId = useId();

function balanceClass(value: number) {
  if (value > 0) {
    return "money-value-positive";
  }

  if (value < 0) {
    return "money-value-negative";
  }

  return "money-value-neutral";
}
</script>

<template>
  <div class="expense-summary-surface min-w-0 border-0 p-0 sm:rounded-xl sm:border sm:p-4">
    <div class="mb-3 flex items-start justify-between gap-3 sm:mb-2 sm:items-center">
      <div class="min-w-0">
        <p class="expense-summary-muted text-xs font-bold uppercase tracking-[0.14em] sm:hidden">{{ props.rangeLabel }}</p>
        <h2 class="mt-0.5 text-lg font-black sm:mt-0 sm:text-base sm:font-semibold">Spending overview</h2>
      </div>

      <span
        class="expense-summary-status inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs sm:hidden"
        :class="props.budgetStatus.bg"
      >
        {{ props.budgetStatus.label }}
      </span>

      <div class="hidden flex-wrap justify-end gap-2 sm:flex">
        <span
          class="expense-summary-pill inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
        >
          Range:
          <span class="expense-summary-pill-value ml-1 font-mono">
            {{ props.rangeLabel }}
          </span>
        </span>

        <span
          class="expense-summary-pill inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
        >
          Top expense:
          <span class="expense-summary-pill-value ml-1 font-semibold">
            {{ props.categoryBreakdown[0]?.category ?? "—" }}
          </span>
        </span>

        <span
          class="expense-summary-status inline-flex items-center rounded-full border px-2.5 py-1 text-xs"
          :class="props.budgetStatus.bg"
        >
          {{ props.budgetStatus.label }}
        </span>
      </div>
    </div>

    <div class="space-y-3 sm:hidden">
      <div class="min-w-0 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-cyan-300/20 dark:bg-cyan-300/[0.07]">
        <div class="text-xs font-bold uppercase tracking-[0.12em] text-sky-700 dark:text-cyan-200">Total spent</div>
        <div class="mt-1 block max-w-full truncate text-[clamp(1.8rem,9vw,2.5rem)] font-black leading-tight text-slate-950 dark:text-white">
          <MoneyAmount :value="props.totalSpent" :currency="props.currency" />
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-white/55">
          <span>{{ props.itemsCount }} {{ props.itemsCount === 1 ? "expense" : "expenses" }}</span>
          <span aria-hidden="true">•</span>
          <span>Daily average <MoneyAmount :value="props.dailyAvg" :currency="props.currency" /></span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="expense-summary-card-muted min-w-0 rounded-2xl border p-3.5">
          <div class="expense-summary-muted text-xs">Net balance</div>
          <div class="mt-1 min-w-0 truncate text-xl font-black leading-tight" :class="balanceClass(props.netBalance)">
            <MoneyAmount :value="props.netBalance" :currency="props.currency" />
          </div>
        </div>
        <div class="expense-summary-card-muted min-w-0 rounded-2xl border p-3.5">
          <div class="expense-summary-muted text-xs">Income</div>
          <div class="mt-1 min-w-0 truncate text-xl font-black leading-tight">
            <MoneyAmount :value="props.totalIncome" :currency="props.currency" />
          </div>
        </div>
      </div>

      <div class="expense-summary-muted flex min-w-0 items-center justify-between gap-3 rounded-xl px-1 text-xs">
        <span>Top category</span>
        <span class="min-w-0 truncate font-bold text-slate-800 dark:text-white">{{ props.categoryBreakdown[0]?.category ?? "No expenses yet" }}</span>
      </div>
    </div>

    <div class="hidden grid-cols-4 gap-3 sm:grid">
      <div class="expense-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="expense-summary-muted text-xs">Items</div>
        <div class="min-w-0 truncate text-lg font-bold">{{ props.itemsCount }}</div>
      </div>

      <div class="expense-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="expense-summary-muted text-xs">Income</div>
        <div
          class="min-w-0 truncate text-lg font-bold leading-tight sm:text-xl"
        >
          <MoneyAmount :value="props.totalIncome" :currency="props.currency" />
        </div>
      </div>

      <div class="expense-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="expense-summary-muted text-xs">Spent</div>
        <div
          class="min-w-0 truncate text-lg font-bold leading-tight sm:text-xl"
        >
          <MoneyAmount :value="props.totalSpent" :currency="props.currency" />
        </div>
      </div>

      <div class="expense-summary-card-muted min-w-0 rounded-xl border p-3">
        <div class="expense-summary-muted text-xs">Net</div>
        <div
          class="min-w-0 truncate text-lg font-bold leading-tight sm:text-xl"
          :class="balanceClass(props.netBalance)"
        >
          <MoneyAmount :value="props.netBalance" :currency="props.currency" />
        </div>
        <div class="mt-1">
          <span
            class="expense-summary-pill inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs"
          >
            <span class="min-w-0 truncate">
              Daily avg (spent):
              <MoneyAmount
                :value="props.dailyAvg"
                :currency="props.currency"
              />
            </span>
          </span>
        </div>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div class="expense-summary-card min-w-0 rounded-2xl border p-4 sm:rounded-xl sm:p-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="font-black sm:font-semibold">Budget</h3>
            <p class="expense-summary-muted mt-0.5 text-xs sm:hidden">Plan for {{ props.rangeLabel.toLowerCase() }}</p>
          </div>

          <select
            v-model="budget.period"
            aria-label="Budget period"
            class="expense-summary-control h-10 rounded-xl border px-3 text-sm font-bold sm:h-11 sm:rounded-lg sm:font-normal"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-3 sm:mt-2 sm:grid-cols-2 sm:gap-2">
          <div class="min-w-0">
            <label :for="budgetAmountId" class="expense-summary-muted mb-1.5 block text-xs font-semibold sm:mb-1 sm:font-normal">Budget amount</label>
            <input
              :id="budgetAmountId"
              v-model.trim="budget.amount"
              inputmode="decimal"
              class="expense-summary-control h-12 w-full rounded-xl border px-4 text-base font-bold sm:h-11 sm:rounded-lg sm:font-normal"
              placeholder="Enter your budget"
            />
          </div>

          <div class="min-w-0">
            <div class="expense-summary-muted mb-1.5 text-xs font-semibold sm:mb-1 sm:font-normal">Remaining</div>
            <div
              class="expense-summary-remaining flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-4 py-2 font-semibold sm:h-11 sm:min-h-0 sm:justify-start sm:rounded-lg sm:py-0"
              :class="props.budgetStatus.bg"
            >
              <span class="min-w-0 truncate text-lg font-black sm:text-base sm:font-semibold">
                <MoneyAmount
                  :value="props.budgetRemaining"
                  :currency="props.currency"
                />
              </span>
              <span class="shrink-0 text-xs font-bold sm:font-medium" :class="props.budgetStatus.text">
                {{ props.budgetStatus.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-4 sm:mt-3">
          <div class="expense-summary-muted mb-1.5 flex justify-between text-xs font-semibold sm:mb-1 sm:font-normal">
            <span>Budget used</span>
            <span class="tabular-nums">{{ props.budgetPercent }}%</span>
          </div>

          <div class="expense-summary-progress-track h-2 overflow-hidden rounded-full border">
            <div
              class="h-2 rounded-full"
              :class="props.budgetStatus.bar"
              :style="{ width: `${Math.min(100, Math.max(0, props.budgetPercent))}%` }"
            />
          </div>

          <p class="expense-summary-muted mt-2 hidden text-xs sm:block">
            Budget uses the selected range:
            <span class="font-mono">{{ props.rangeLabel }}</span>.
          </p>
        </div>
      </div>

      <div class="expense-summary-card-muted min-w-0 rounded-2xl border p-4 sm:rounded-xl sm:p-3">
        <h3 class="mb-1 font-black sm:font-semibold">Insights</h3>
        <ul class="expense-summary-body list-disc space-y-1 pl-5 text-sm">
          <li
            v-for="(message, index) in props.insights"
            :key="index"
            class="break-words"
            :title="message.title"
          >
            {{ message.text }}
          </li>
          <li v-if="props.insights.length === 0" class="expense-summary-muted">
            No insights yet.
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-5 sm:mt-4">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="font-black sm:font-semibold">Spending by category</h3>
        <span class="expense-summary-muted text-xs">
          {{ props.categoryBreakdown.length ? "Highest first" : "" }}
        </span>
      </div>

      <ul v-if="props.categoryBreakdown.length" class="space-y-2">
        <li
          v-for="category in props.categoryBreakdown"
          :key="category.category"
          class="expense-summary-card-muted min-w-0 rounded-2xl border p-3.5 sm:rounded-xl sm:p-3"
        >
          <div class="flex min-w-0 items-center justify-between gap-3">
            <div class="min-w-0 truncate text-sm font-bold">{{ category.category }}</div>
            <div class="min-w-0 max-w-[55%] shrink-0 truncate text-right font-black">
              <MoneyAmount :value="category.total" :currency="props.currency" />
            </div>
          </div>
          <div class="mt-2 flex items-center gap-3">
            <div class="expense-summary-progress-track h-1.5 min-w-0 flex-1 overflow-hidden rounded-full">
              <div class="h-full rounded-full bg-sky-500 dark:bg-cyan-200" :style="{ width: `${category.percent}%` }" />
            </div>
            <span class="expense-summary-muted w-10 shrink-0 text-right text-xs tabular-nums">{{ category.percent.toFixed(0) }}%</span>
          </div>
        </li>
      </ul>

      <div v-else class="expense-summary-muted text-sm">
        Add expenses to see spending by category.
      </div>
    </div>

    <p class="expense-summary-muted mt-4 hidden text-xs sm:block">
      Tip: keep categories consistent (Food vs food). Your future self will
      thank you 😄
    </p>
  </div>
</template>
