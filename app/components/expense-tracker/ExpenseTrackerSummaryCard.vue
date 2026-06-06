<script setup lang="ts">
import type {
  Breakdown,
  Budget,
  ExpenseBudgetStatus,
  ExpenseCurrency,
  ExpenseInsight,
  ExpenseItem,
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
  topExpenses: ExpenseItem[];
}>();

const budget = defineModel<Budget>("budget", { required: true });

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
  <div class="expense-summary-surface rounded-xl border p-4">
    <div class="mb-2 flex items-center justify-between gap-3">
      <h2 class="font-semibold">Summary</h2>

      <div class="flex flex-wrap justify-end gap-2">
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

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
      <div class="expense-summary-card min-w-0 rounded-xl border p-3">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">Budget</h3>

          <select
            v-model="budget.period"
            class="expense-summary-control h-11 rounded-lg border px-3 text-sm"
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        <div class="mt-2 grid grid-cols-2 gap-2">
          <div class="min-w-0">
            <div class="expense-summary-muted mb-1 text-xs">Budget amount</div>
            <input
              v-model.trim="budget.amount"
              inputmode="decimal"
              class="expense-summary-control h-11 w-full rounded-lg border px-4 text-base"
              placeholder="e.g. 200"
            />
          </div>

          <div class="min-w-0">
            <div class="expense-summary-muted mb-1 text-xs">Remaining</div>
            <div
              class="expense-summary-remaining flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border px-4 font-semibold"
              :class="props.budgetStatus.bg"
            >
              <span class="min-w-0 truncate">
                <MoneyAmount
                  :value="props.budgetRemaining"
                  :currency="props.currency"
                />
              </span>
              <span class="shrink-0 text-xs font-medium" :class="props.budgetStatus.text">
                {{ props.budgetStatus.label }}
              </span>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="expense-summary-muted mb-1 flex justify-between text-xs">
            <span>Spent</span>
            <span>{{ props.budgetPercent }}%</span>
          </div>

          <div class="expense-summary-progress-track h-2 overflow-hidden rounded-full border">
            <div
              class="h-2 rounded-full"
              :class="props.budgetStatus.bar"
              :style="{ width: `${Math.min(100, Math.max(0, props.budgetPercent))}%` }"
            />
          </div>

          <p class="expense-summary-muted mt-2 text-xs">
            Budget uses the selected range:
            <span class="font-mono">{{ props.rangeLabel }}</span>.
          </p>
        </div>
      </div>

      <div class="expense-summary-card-muted min-w-0 rounded-xl border p-3">
        <h3 class="mb-1 font-semibold">Insights</h3>
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

    <div class="mt-4">
      <div class="mb-2 flex items-center justify-between">
        <h3 class="font-semibold">Expense breakdown</h3>
        <span class="expense-summary-muted text-xs">
          {{ props.categoryBreakdown.length ? "Top first" : "" }}
        </span>
      </div>

      <div class="expense-summary-card overflow-auto rounded-xl border">
        <table class="w-full text-sm">
          <thead class="expense-summary-card-muted">
            <tr>
              <th class="p-2 text-left">Category</th>
              <th class="p-2 text-right">Total</th>
              <th class="p-2 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="category in props.categoryBreakdown"
              :key="category.category"
              class="border-t"
            >
              <td class="p-2 font-medium">{{ category.category }}</td>
              <td class="max-w-[9rem] p-2 text-right sm:max-w-none">
                <MoneyAmount
                  :value="category.total"
                  :currency="props.currency"
                />
              </td>
              <td class="p-2 text-right">{{ category.percent.toFixed(0) }}%</td>
            </tr>

            <tr v-if="props.categoryBreakdown.length === 0">
              <td class="expense-summary-muted p-3" colspan="3">No data yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mt-4">
      <h3 class="mb-2 font-semibold">Top expenses</h3>

      <ul v-if="props.topExpenses.length" class="space-y-2">
        <li
          v-for="(item, index) in props.topExpenses"
          :key="`${item.date}-${item.category}-${index}`"
          class="expense-summary-card-muted flex items-center justify-between gap-3 rounded-xl border p-3"
        >
          <div class="min-w-0 text-sm">
            <div class="truncate font-semibold">{{ item.category }}</div>
            <div class="expense-summary-muted truncate text-xs">
              {{ item.date }} • {{ item.note || "—" }}
            </div>
          </div>
          <div
            class="min-w-0 max-w-[45%] shrink-0 truncate text-right font-bold"
          >
            <MoneyAmount :value="item.amount" :currency="props.currency" />
          </div>
        </li>
      </ul>

      <div v-else class="expense-summary-muted text-sm">
        Add expenses to see top spending.
      </div>
    </div>

    <p class="expense-summary-muted mt-4 text-xs">
      Tip: keep categories consistent (Food vs food). Your future self will
      thank you 😄
    </p>
  </div>
</template>
