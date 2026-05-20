<script setup lang="ts">
import type { PdfToolDef } from "~/data/pdf-tools";

defineProps<{
  tool: PdfToolDef;
}>();
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-6">
    <header class="space-y-3">
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
        <p class="max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ tool.description }}
        </p>
      </div>
    </header>

    <slot />
  </main>
</template>
