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
        class="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 shadow-sm ring-1 ring-black/5 transition group-hover:scale-105 dark:bg-white/[0.08] dark:ring-white/10"
            aria-hidden="true"
          >
            <img
              :src="tool.iconPath"
              alt=""
              aria-hidden="true"
              class="h-9 w-9 rounded-lg object-contain"
              loading="lazy"
              decoding="async"
            />
          </span>
          <div class="min-w-0">
            <h3 class="text-sm font-bold text-slate-950 dark:text-white">
              {{ tool.name }}
            </h3>
            <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55">
              {{ tool.description }}
            </p>
          </div>
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
