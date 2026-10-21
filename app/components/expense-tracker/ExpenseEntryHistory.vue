<script setup lang="ts">
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import { resolveExpenseCategory } from "~/lib/expense-tracker";

const props = defineProps<{
  currency: ExpenseCurrency;
  rows: ExpenseRow[];
  searchedDate: string | null;
  loading: boolean;
  busy: boolean;
  error: string;
}>();
const date = defineModel<string>("date", { required: true });
const emit = defineEmits<{ search: []; edit: [row: ExpenseRow] }>();
const entries = computed(() =>
  props.searchedDate
    ? props.rows
        .filter((row) => row.date === props.searchedDate)
        .slice()
        .reverse()
    : [],
);

function amountValue(row: ExpenseRow) {
  return row.amount && Number.isFinite(Number(row.amount))
    ? Number(row.amount)
    : null;
}
</script>

<template>
  <section
    class="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#101214] sm:p-6"
    aria-label="Search expense entries by day"
    :aria-busy="loading"
  >
    <h2 class="text-lg font-black text-slate-950 dark:text-white">
      Find entries by day
    </h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-white/55">
      Choose a specific day to view your entries.
    </p>
    <form class="mt-4" @submit.prevent="emit('search')">
      <fieldset
        :disabled="busy || loading"
        class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <ModernDateInput
          v-model="date"
          aria-label="Search entries for a specific day"
        />
        <button
          type="submit"
          class="h-11 rounded-xl bg-sky-600 px-5 text-sm font-black text-white disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950"
        >
          {{ loading ? "Searching…" : "Search entries" }}
        </button>
      </fieldset>
    </form>
    <p
      v-if="error"
      role="alert"
      class="mt-3 text-sm text-red-600 dark:text-red-300"
    >
      {{ error }}
    </p>
    <p
      v-if="!searchedDate"
      class="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-white/15 dark:text-white/55"
    >
      Search a day to see its entries.
    </p>
    <div v-else class="mt-5 space-y-3">
      <p
        role="status"
        class="text-sm font-bold text-slate-600 dark:text-white/65"
      >
        {{ searchedDate }} · {{ entries.length }}
        {{ entries.length === 1 ? "entry" : "entries" }}
      </p>
      <p
        v-if="entries.length === 0"
        class="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-white/[0.035] dark:text-white/55"
      >
        No entries for this day.
      </p>
      <ul v-else class="divide-y divide-slate-200 dark:divide-white/10">
        <li
          v-for="row in entries"
          :key="row.id"
          class="flex min-w-0 items-center gap-3 py-4 sm:gap-5"
        >
          <div class="min-w-0 flex-1">
            <p class="break-words font-bold text-slate-950 dark:text-white">
              {{ resolveExpenseCategory(row) }}
            </p>
            <p
              v-if="row.note"
              class="mt-1 whitespace-pre-wrap break-words text-sm text-slate-500 dark:text-white/55"
            >
              {{ row.note }}
            </p>
            <p class="mt-1 text-xs text-slate-400 dark:text-white/40">
              {{ row.type === "income" ? "Income" : "Expense" }} ·
              {{ row.date }}
            </p>
          </div>
          <div
            class="min-w-0 max-w-[35%] text-right font-black"
            :class="
              row.type === 'income'
                ? 'text-emerald-600 dark:text-emerald-300'
                : 'text-slate-950 dark:text-white'
            "
          >
            <MoneyAmount
              v-if="amountValue(row) !== null"
              :value="amountValue(row) ?? 0"
              :currency="currency"
            />
            <span v-else>—</span>
          </div>
          <button
            type="button"
            :disabled="busy || loading"
            :aria-label="`Edit ${resolveExpenseCategory(row)} entry for ${row.date}`"
            class="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-sm font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:border-white/15 dark:text-cyan-200 dark:hover:bg-white/5"
            @click="emit('edit', row)"
          >
            Edit
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
