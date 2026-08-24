<script setup lang="ts">
import { History, RotateCcw, Trash2 } from "lucide-vue-next";

export type PaybackHistoryItem = {
  id: string;
  currency: 'USD' | 'KHR';
  remainderMode: 'LEFTOVER_ONLY' | 'ASSIGN_TO_PERSON';
  remainderPayer: string;
  total: string;
  participantCount: number;
  createdAt: string;
  rows: Array<{ name: string; amount: string }>;
};

const props = defineProps<{
  items: PaybackHistoryItem[];
  loading: boolean;
  deletingId: string;
}>();

const emit = defineEmits<{
  load: [item: PaybackHistoryItem];
  remove: [item: PaybackHistoryItem];
}>();

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatTotal(item: PaybackHistoryItem) {
  const amount = Number(item.total);
  if (item.currency === 'KHR') return `${Math.round(amount).toLocaleString()}៛`;
  return `$${amount.toFixed(2)}`;
}
</script>

<template>
  <section class="payback-card mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="payback-history-title">
    <div class="flex items-start gap-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">
        <History class="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <h2 id="payback-history-title" class="font-bold">Calculation history</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">Reopen a calculation saved to your account.</p>
      </div>
    </div>

    <p v-if="props.loading" class="mt-5 text-sm text-slate-500 dark:text-white/50" role="status">Loading history…</p>
    <div v-else-if="props.items.length === 0" class="payback-subtle mt-5 rounded-xl p-4 text-sm text-slate-600 dark:text-white/60">
      No saved calculations yet. Complete a calculation, then choose “Save history”.
    </div>
    <ul v-else class="payback-panel mt-5 divide-y overflow-hidden rounded-xl border">
      <li v-for="item in props.items" :key="item.id" class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <strong class="text-sm">{{ formatTotal(item) }}</strong>
            <span class="text-xs text-slate-500 dark:text-white/45">{{ item.participantCount }} people</span>
            <span class="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-white/55">{{ item.currency }}</span>
          </div>
          <p class="mt-1 truncate text-xs text-slate-500 dark:text-white/45">
            {{ item.rows.map((row) => row.name).join(', ') }} · {{ formatCreatedAt(item.createdAt) }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button type="button" class="payback-secondary inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold" @click="emit('load', item)">
            <RotateCcw class="h-3.5 w-3.5" aria-hidden="true" /> Reopen
          </button>
          <button type="button" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-400/10" :disabled="props.deletingId === item.id" :aria-label="`Delete calculation from ${formatCreatedAt(item.createdAt)}`" @click="emit('remove', item)">
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
