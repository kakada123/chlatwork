<script setup lang="ts">
import type { PdfToolFaq } from "~/data/pdf-tools";

defineProps<{
  howItWorks: string[];
  useCases?: string[];
  faq: PdfToolFaq[];
}>();
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-3">
    <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.06]">
      <h2 class="text-lg font-black text-slate-950 dark:text-white">How to use</h2>
      <ol class="mt-3 space-y-2 text-sm text-slate-600 dark:text-white/65">
        <li v-for="(item, index) in howItWorks" :key="item" class="flex gap-3">
          <span class="font-black text-sky-700 dark:text-cyan-300">{{ index + 1 }}.</span>
          <span>{{ item }}</span>
        </li>
      </ol>
    </div>

    <div
      v-if="useCases?.length"
      class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-lg font-black text-slate-950 dark:text-white">Example use cases</h2>
      <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-white/65">
        <li v-for="item in useCases" :key="item" class="flex gap-3">
          <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden="true" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.06]">
      <h2 class="text-lg font-black text-slate-950 dark:text-white">FAQ</h2>
      <div class="mt-3 space-y-3">
        <details
          v-for="item in faq"
          :key="item.question"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.05]"
        >
          <summary class="cursor-pointer text-sm font-bold text-slate-950 dark:text-white">
            {{ item.question }}
          </summary>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ item.answer }}
          </p>
        </details>
      </div>
    </div>
  </section>
</template>
