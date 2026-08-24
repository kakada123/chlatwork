<script setup lang="ts">
import type { PdfToolDef } from "~/data/pdf-tools";

defineProps<{
  tool: PdfToolDef;
}>();
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-6">
    <header class="space-y-2">
      <NuxtLink
        to="/tools/pdf"
        class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
      >
        PDF tools
      </NuxtLink>

      <div class="space-y-2">
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ tool.name }}
        </h1>
        <p class="max-w-2xl text-sm text-slate-500 dark:text-white/55">
          {{ tool.description }}
        </p>
        <p
          v-if="tool.status === 'beta' && tool.betaNotice"
          class="max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100"
          role="note"
        >
          {{ tool.betaNotice }}
        </p>
      </div>
    </header>

    <slot />
  </main>
</template>
