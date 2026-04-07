<script setup lang="ts">
import type {
  ExpenseCurrency,
  ExpenseRangeMode,
  ExpenseRow,
} from "~/lib/expense-tracker";
import {
  createExpenseRow,
  createIncomeRow,
  expenseCategories,
  getPresetCategoriesForExpenseRow,
} from "~/lib/expense-tracker";

defineProps<{
  copied: boolean;
  canCopy: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: "load-example"): void;
  (e: "copy-summary"): void;
  (e: "apply-raw"): void;
}>();

const currency = defineModel<ExpenseCurrency>("currency", { required: true });
const rangeMode = defineModel<ExpenseRangeMode>("rangeMode", { required: true });
const rows = defineModel<ExpenseRow[]>("rows", { required: true });
const raw = defineModel<string>("raw", { required: true });

function presetCategoriesForRow(row: ExpenseRow) {
  return getPresetCategoriesForExpenseRow(row);
}

function addRow() {
  rows.value = [...rows.value, createExpenseRow()];
}

function quickAdd(category: string) {
  rows.value = [...rows.value, createExpenseRow(category)];
}

function quickAddIncome() {
  rows.value = [...rows.value, createIncomeRow()];
}

function removeRow(index: number) {
  rows.value = rows.value.filter((_, rowIndex) => rowIndex !== index);
}
</script>

<template>
  <div class="rounded-xl border bg-white p-4">
    <div class="mb-2 flex items-center justify-between">
      <h2 class="font-semibold">Input</h2>

      <div class="flex items-center gap-2">
        <select v-model="currency" class="rounded-lg border px-2 py-1 text-sm">
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select>

        <select v-model="rangeMode" class="rounded-lg border px-2 py-1 text-sm">
          <option value="all">All</option>
          <option value="month">This month</option>
          <option value="week">Last 7 days</option>
          <option value="today">Today</option>
        </select>
      </div>
    </div>

    <div class="mb-3 flex flex-wrap gap-2">
      <button
        v-for="category in expenseCategories"
        :key="category"
        class="rounded-full border bg-white px-2.5 py-1 text-xs hover:bg-gray-50 active:scale-[0.99]"
        type="button"
        @click="quickAdd(category)"
      >
        {{ category }}
      </button>

      <button
        class="rounded-full border bg-white px-2.5 py-1 text-xs hover:bg-gray-50 active:scale-[0.99]"
        type="button"
        title="Add income row"
        @click="quickAddIncome"
      >
        + Income
      </button>
    </div>

    <div class="space-y-3 md:hidden">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="rounded-xl border p-3"
      >
        <div class="grid grid-cols-1 gap-2">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <div class="mb-1 text-xs text-gray-500">Type</div>
              <select
                v-model="row.type"
                class="h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div>
              <div class="mb-1 text-xs text-gray-500">Date</div>
              <input
                v-model="row.date"
                type="date"
                class="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Category</div>
            <select
              v-model="row.category"
              class="h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            >
              <option
                v-for="category in presetCategoriesForRow(row)"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
              <option value="__custom__">Custom…</option>
            </select>

            <input
              v-if="row.category === '__custom__'"
              v-model.trim="row.customCategory"
              class="mt-2 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Type category..."
            />
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Note</div>
            <input
              v-model.trim="row.note"
              class="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Optional note..."
            />
          </div>

          <div>
            <div class="mb-1 text-xs text-gray-500">Amount</div>
            <input
              v-model.trim="row.amount"
              inputmode="decimal"
              class="h-10 w-full rounded-lg border px-3 text-right text-sm outline-none focus:ring-2 focus:ring-black/10"
              placeholder="0"
            />
          </div>
        </div>

        <div class="mt-3 flex justify-end">
          <button
            class="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100"
            type="button"
            @click="removeRow(index)"
          >
            ✕ Remove
          </button>
        </div>
      </div>

      <div
        v-if="rows.length === 0"
        class="rounded-xl border p-3 text-sm text-gray-500"
      >
        No rows yet. Click “Add row”.
      </div>
    </div>

    <div class="hidden overflow-hidden rounded-xl border md:block">
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
            v-for="(row, index) in rows"
            :key="index"
            class="border-t align-top"
          >
            <td class="p-2">
              <select
                v-model="row.type"
                class="h-11 w-full rounded-lg border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </td>

            <td class="p-2">
              <input
                v-model="row.date"
                type="date"
                class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </td>

            <td class="p-2">
              <select
                v-model="row.category"
                class="h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              >
                <option
                  v-for="category in presetCategoriesForRow(row)"
                  :key="category"
                  :value="category"
                >
                  {{ category }}
                </option>
                <option value="__custom__">Custom…</option>
              </select>

              <input
                v-if="row.category === '__custom__'"
                v-model.trim="row.customCategory"
                class="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Type category..."
              />
            </td>

            <td class="p-2">
              <input
                v-model.trim="row.note"
                class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="Optional note..."
              />
            </td>

            <td class="p-2">
              <input
                v-model.trim="row.amount"
                inputmode="decimal"
                class="h-11 w-full rounded-lg border px-3 text-right text-sm outline-none focus:ring-2 focus:ring-black/10"
                placeholder="0"
              />
            </td>

            <td class="p-2 pr-3">
              <div class="flex justify-end">
                <button
                  class="h-11 w-11 rounded-lg border text-base leading-none hover:bg-gray-100"
                  type="button"
                  :aria-label="`Remove row ${index + 1}`"
                  @click="removeRow(index)"
                >
                  ✕
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="rows.length === 0">
            <td class="p-3 text-gray-500" colspan="6">
              No rows yet. Click “Add row”.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2">
      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
        type="button"
        @click="addRow"
      >
        <span class="text-base leading-none">＋</span>
        <span class="truncate">Add row</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-black px-3 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 active:scale-[0.99]"
        type="button"
        @click="emit('load-example')"
      >
        <span class="truncate">Load example</span>
      </button>

      <button
        class="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10 disabled:opacity-40 disabled:hover:bg-white disabled:active:scale-100 active:scale-[0.99]"
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

    <details class="mt-4">
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
          class="rounded-lg border bg-white px-4 py-2 hover:bg-gray-100"
          type="button"
          @click="emit('apply-raw')"
        >
          Apply paste to rows
        </button>
      </div>
    </details>

    <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
