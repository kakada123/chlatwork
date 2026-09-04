<script setup lang="ts">
import { Coins } from "lucide-vue-next";

defineProps<{
  required: number;
  available: number | null;
}>();

const emit = defineEmits<{ cancel: [] }>();
</script>

<template>
  <section
    class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100"
    role="alert"
  >
    <span
      class="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-200/15 dark:text-amber-200"
      aria-hidden="true"
    >
      <Coins class="size-5" />
    </span>
    <h2 class="mt-4 text-lg font-semibold">You need {{ required }} credits</h2>
    <p class="mt-2 text-sm leading-6 text-amber-900/80 dark:text-amber-100/75">
      <template v-if="available !== null"
        >Available: {{ available }} credits.
      </template>
      Processing has not started and no credits were deducted.
    </p>
    <div class="mt-5 flex flex-wrap gap-2">
      <NuxtLink
        to="/pricing"
        class="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-amber-200 dark:text-amber-950"
        >Get Credits</NuxtLink
      >
      <button
        type="button"
        class="min-h-11 rounded-xl border border-amber-300 px-4 text-sm font-semibold transition hover:bg-amber-100 dark:border-amber-200/20 dark:hover:bg-amber-200/10"
        @click="emit('cancel')"
      >
        Cancel
      </button>
    </div>
  </section>
</template>
