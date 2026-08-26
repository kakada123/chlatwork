<script setup lang="ts">
defineProps<{
  winner: string;
  note: string;
  winnerCopied: boolean;
  canSpin: boolean;
}>();

defineEmits<{
  copy: [];
  spinAgain: [];
}>();
</script>

<template>
  <div class="text-center">
    <p class="text-xs font-black uppercase tracking-[0.18em] text-sky-700 dark:text-cyan-300">
      Winner
    </p>
    <h3 class="mt-1 break-words text-2xl font-black text-slate-950 dark:text-white">
      {{ winner }}
    </h3>
    <p
      v-if="note"
      class="mx-auto mt-3 max-w-sm break-words rounded-xl border border-sky-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/15 dark:bg-black/20 dark:text-white/80"
    >
      <span class="mr-1 text-xs font-black uppercase tracking-wide text-sky-700 dark:text-cyan-300">
        Assigned note:
      </span>
      {{ note }}
    </p>
    <div class="mt-4 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        class="rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-white/15 dark:bg-white/[0.06] dark:text-cyan-200 dark:hover:bg-white/10"
        @click="$emit('copy')"
      >
        {{ winnerCopied ? "Winner copied" : "Copy winner" }}
      </button>
      <button
        type="button"
        class="rounded-xl bg-sky-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canSpin"
        @click="$emit('spinAgain')"
      >
        Spin again
      </button>
    </div>
  </div>
</template>
