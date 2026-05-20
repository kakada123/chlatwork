<script setup lang="ts">
import type { PdfToolDef } from "~/data/pdf-tools";

defineProps<{
  tools: PdfToolDef[];
}>();
</script>

<template>
  <section class="space-y-3">
    <h2 class="text-lg font-black text-slate-950 dark:text-white">Related tools</h2>
    <div class="grid gap-3 sm:grid-cols-3">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.key"
        :to="tool.route"
        class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
      >
        <h3 class="text-sm font-bold text-slate-950 dark:text-white">{{ tool.name }}</h3>
        <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55">
          {{ tool.description }}
        </p>
      </NuxtLink>
    </div>
  </section>
</template>
