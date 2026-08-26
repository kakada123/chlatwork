<script setup lang="ts">
import type {
  ExpenseCurrency,
  ExpenseRangeMode,
  ExpenseRow,
} from "~/lib/expense-tracker";
import {
  createExpenseRow,
  createIncomeRow,
  getPresetCategoriesForExpenseRow,
} from "~/lib/expense-tracker";
import QuickExpenseForm from "~/components/expense-tracker/QuickExpenseForm.vue";

type QuickExpenseFormHandle = {
  resetForm: () => void;
};

defineProps<{
  copied: boolean;
  canCopy: boolean;
  error: string;
  signedIn: boolean;
}>();

const emit = defineEmits<{
  (e: "load-example"): void;
  (e: "copy-summary"): void;
  (e: "apply-raw"): void;
  (e: "quick-add"): void;
}>();

const currency = defineModel<ExpenseCurrency>("currency", { required: true });
const rangeMode = defineModel<ExpenseRangeMode>("rangeMode", { required: true });
const rows = defineModel<ExpenseRow[]>("rows", { required: true });
const raw = defineModel<string>("raw", { required: true });
const quickForm = ref<QuickExpenseFormHandle | null>(null);

// Rows are shared without persisted IDs, so local keys keep inputs stable while newest rows render first.
const rowKeys = new WeakMap<ExpenseRow, string>();
let rowKeyId = 0;

function getRowKey(row: ExpenseRow) {
  const existingKey = rowKeys.get(row);
  if (existingKey) {
    return existingKey;
  }

  const nextKey = `expense-row-${rowKeyId}`;
  rowKeyId += 1;
  rowKeys.set(row, nextKey);

  return nextKey;
}

const displayRows = computed(() =>
  rows.value
    .map((row, sourceIndex) => ({
      key: getRowKey(row),
      row,
      sourceIndex,
    }))
    .reverse(),
);

function presetCategoriesForRow(row: ExpenseRow) {
  return getPresetCategoriesForExpenseRow(row);
}

function addRow() {
  rows.value = [...rows.value, createExpenseRow()];
}

function quickAddIncome() {
  rows.value = [...rows.value, createIncomeRow()];
}

function addQuickExpense(row: ExpenseRow) {
  rows.value = [...rows.value, row];
  quickForm.value?.resetForm();
  emit("quick-add");
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);
}
</script>

<template>
  <div class="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6">
    <div class="mb-5 hidden items-start justify-between gap-3 sm:flex">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-cyan-200">Fast entry</p>
        <h2 class="mt-1 text-xl font-black text-slate-950 dark:text-white">Add an expense</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
          {{ signedIn ? "Enter the amount now. Your account saves it automatically." : "Enter the amount now, then sign in to save it." }}
        </p>
      </div>

      <div class="shrink-0">
        <label for="expense-currency" class="sr-only">Currency</label>
        <select id="expense-currency" v-model="currency" class="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm font-bold dark:border-white/10">
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select>
      </div>
    </div>

    <QuickExpenseForm ref="quickForm" :currency="currency" @submit="addQuickExpense" />

    <details class="group mt-5 hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.035] sm:block">
      <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-black text-slate-700 dark:text-white/75">
        <span>
          Review and manage saved entries
          <span class="ml-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-white/10 dark:text-white/55">{{ rows.length }}</span>
        </span>
        <svg class="h-4 w-4 shrink-0 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>

      <div class="border-t border-slate-200 p-3 dark:border-white/10 sm:p-4">
        <div class="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto]">
          <select v-model="rangeMode" class="h-11 min-w-0 rounded-lg border px-3 text-sm">
            <option value="all">All entries</option>
            <option value="month">This month</option>
            <option value="week">Last 7 days</option>
            <option value="today">Today</option>
          </select>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white dark:focus-visible:ring-cyan-200/15"
        type="button"
        @click="addRow"
      >
        <span class="text-base leading-none">＋</span>
        <span class="truncate">Blank expense</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99] dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white dark:focus-visible:ring-cyan-200/15"
        type="button"
        @click="quickAddIncome"
      >
        <span class="text-base leading-none">＋</span>
        <span class="truncate">Add income</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-black px-3 text-sm font-medium text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99] dark:bg-cyan-200 dark:text-slate-950 dark:hover:bg-cyan-100 dark:focus-visible:ring-cyan-200/15"
        type="button"
        @click="emit('load-example')"
      >
        <span class="truncate">Load example</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white dark:focus-visible:ring-cyan-200/15"
        type="button"
        :disabled="!canCopy"
        @click="emit('copy-summary')"
      >
        <svg
          v-if="!copied"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          class="h-4 w-4"
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
          class="h-4 w-4"
        >
          <path
            fill="currentColor"
            d="M9.55 18.2 4.8 13.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4-9.65 9.65Z"
          />
        </svg>

        <span class="truncate">{{ copied ? "Copied" : "Copy" }}</span>
      </button>
        </div>

    <div class="space-y-3 md:hidden">
      <div
        v-for="(displayRow, displayIndex) in displayRows"
        :key="displayRow.key"
        class="rounded-xl border p-3"
      >
        <div class="grid grid-cols-1 gap-2">
          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <div class="mb-1 text-xs text-gray-500">Type</div>
              <select
                v-model="displayRow.row.type"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <div class="mb-1 text-xs text-gray-500">Date</div>
              <ModernDateInput
                v-model="displayRow.row.date"
                size="sm"
                :aria-label="`Choose date for row ${displayIndex + 1}`"
              />
            </div>
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Category</div>
            <select
              v-model="displayRow.row.category"
              class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            >
              <option
                v-for="category in presetCategoriesForRow(displayRow.row)"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
              <option value="__custom__">Custom…</option>
            </select>

            <input
              v-if="displayRow.row.category === '__custom__'"
              v-model.trim="displayRow.row.customCategory"
              class="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Type category..."
            />
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Note</div>
            <input
              v-model.trim="displayRow.row.note"
              class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Optional note..."
            />
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Amount</div>
            <input
              v-model.trim="displayRow.row.amount"
              inputmode="decimal"
              class="h-11 w-full rounded-lg border px-3 text-right text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="0"
            />
          </div>
        </div>

        <div class="mt-3 flex justify-end">
          <button
            class="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            type="button"
            @click="removeRow(displayRow.sourceIndex)"
          >
            ✕ Remove
          </button>
        </div>
      </div>

      <div
        v-if="rows.length === 0"
        class="rounded-xl border p-3 text-sm text-gray-500"
      >
        No rows yet. Click “Add expense”.
      </div>
    </div>

    <div class="hidden overflow-visible rounded-xl border md:block">
      <table class="w-full table-fixed text-sm">
        <thead class="bg-gray-50">
          <tr>
            <th class="w-[110px] p-2 text-left">Type</th>
            <th class="w-[22%] p-2 text-left">Date</th>
            <th class="w-[22%] p-2 text-left">Category</th>
            <th class="w-[33%] p-2 text-left">Note</th>
            <th class="w-[15%] p-2 text-right">Amount</th>
            <th class="w-[72px] p-2"></th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="(displayRow, displayIndex) in displayRows"
            :key="displayRow.key"
            class="border-t align-top"
          >
            <td class="p-2">
              <select
                v-model="displayRow.row.type"
                class="h-11 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </td>

            <td class="p-2">
              <ModernDateInput
                v-model="displayRow.row.date"
                :aria-label="`Choose date for row ${displayIndex + 1}`"
              />
            </td>

            <td class="p-2">
              <select
                v-model="displayRow.row.category"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option
                  v-for="category in presetCategoriesForRow(displayRow.row)"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
                <option value="__custom__">Custom…</option>
              </select>

              <input
                v-if="displayRow.row.category === '__custom__'"
                v-model.trim="displayRow.row.customCategory"
                class="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Type category..."
              />
            </td>

            <td class="p-2">
              <input
                v-model.trim="displayRow.row.note"
                class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Optional note..."
              />
            </td>

            <td class="p-2">
              <input
                v-model.trim="displayRow.row.amount"
                inputmode="decimal"
                class="h-11 w-full rounded-lg border px-3 text-right text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="0"
              />
            </td>

            <td class="p-2 pr-3">
              <div class="flex justify-end">
                <button
                  class="h-11 w-11 rounded-lg border border-gray-200 text-base leading-none text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
                  type="button"
                  :aria-label="`Remove row ${displayIndex + 1}`"
                  @click="removeRow(displayRow.sourceIndex)"
                >
                  ✕
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="rows.length === 0">
            <td class="p-3 text-gray-500" colspan="6">
              No rows yet. Click “Add expense”.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <details class="mt-4 rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
        Paste mode (optional)
      </summary>

      <textarea
        v-model="raw"
        class="mt-2 h-44 w-full rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-black/10"
        placeholder="Format:
2026-01-29, expense, Food, lunch, 3.5
2026-01-29, income, Salary, Jan, 740

(Comma or tab supported)"
      />

      <div class="mt-2 flex gap-2">
        <button
          class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white"
          type="button"
          @click="emit('apply-raw')"
        >
          Apply paste to rows
        </button>
      </div>
    </details>
      </div>
    </details>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
