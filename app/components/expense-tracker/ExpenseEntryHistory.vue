<script setup lang="ts">
import { CalendarDays, ReceiptText } from "lucide-vue-next";
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
    id="expense-entries"
    class="min-w-0 rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 dark:bg-[#101214] dark:ring-white/[0.08] sm:p-5"
    aria-label="Search expense entries by day"
    :aria-busy="loading"
  >
    <h2
      class="flex items-center gap-2 text-base font-bold text-slate-950 dark:text-white"
    >
      <CalendarDays
        class="h-5 w-5 text-sky-600 dark:text-cyan-200"
        aria-hidden="true"
      />
      Saved entries
    </h2>
    <p class="mt-1 text-xs text-slate-500 dark:text-white/55">
      Find entries by day, then tap Edit to make changes.
    </p>
    <form class="mt-4" @submit.prevent="emit('search')">
      <fieldset
        :disabled="busy || loading"
        class="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
      >
        <ModernDateInput
          v-model="date"
          aria-label="Search entries for a specific day"
        />
        <button
          type="submit"
          class="h-11 rounded-xl bg-sky-600 px-3 text-xs font-bold text-white disabled:opacity-50 dark:bg-cyan-200 dark:text-slate-950"
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
      v-if="loading"
      role="status"
      class="mt-4 text-sm text-slate-500 dark:text-white/55"
    >
      Loading entries…
    </p>
    <div v-else-if="searchedDate" class="mt-4">
      <p role="status" class="mb-2 text-xs text-slate-400 dark:text-white/40">
        {{ searchedDate }} · {{ entries.length }}
        {{ entries.length === 1 ? "entry" : "entries" }}
      </p>
      <p
        v-if="entries.length === 0"
        class="py-5 text-sm text-slate-500 dark:text-white/55"
      >
        No entries for this day.
      </p>
      <ul v-else class="divide-y divide-slate-100 dark:divide-white/[0.06]">
        <li
          v-for="row in entries"
          :key="row.id"
          class="flex min-w-0 items-center gap-3 py-3"
        >
          <span
            class="grid size-8 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-cyan-200/10 dark:text-cyan-200 sm:hidden"
            aria-hidden="true"
            ><ReceiptText class="size-4"
          /></span>
          <div class="min-w-0 flex-1">
            <p
              class="whitespace-pre-wrap break-words text-sm font-semibold text-slate-950 dark:text-white"
            >
              {{ row.note || resolveExpenseCategory(row) }}
            </p>
            <p
              class="mt-1 break-words text-xs text-slate-500 dark:text-white/50"
            >
              {{ resolveExpenseCategory(row) }} · {{ row.date
              }}<span v-if="row.type === 'income'"> · Income</span>
            </p>
          </div>
          <div
            class="min-w-0 max-w-[35%] text-right text-sm font-bold tabular-nums"
            :class="
              row.type === 'income'
                ? 'text-emerald-600 dark:text-emerald-300'
                : 'text-red-500 dark:text-red-300'
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
            class="min-h-11 shrink-0 rounded-lg px-2 text-xs font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-50 dark:text-cyan-200 dark:hover:bg-white/5"
            @click="emit('edit', row)"
          >
            Edit
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
