<script setup lang="ts">
import type { PdfToolDef } from "~/data/pdf-tools";

const props = defineProps<{
  tool: PdfToolDef;
}>();

const parentDirectory = computed(() =>
  props.tool.category === "Developer Tools"
    ? { label: "Developer tools", path: "/tools/developer-tools" }
    : { label: "PDF tools", path: "/tools/pdf" },
);
</script>

<template>
  <main class="mx-auto w-full max-w-[1180px] space-y-6">
    <header class="space-y-2">
      <NuxtLink
        :to="parentDirectory.path"
        class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
      >
        {{ parentDirectory.label }}
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
        <p
          v-if="tool.status === 'soon' && tool.comingSoonNotice"
          class="max-w-3xl rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium leading-6 text-sky-900 dark:border-cyan-300/25 dark:bg-cyan-300/10 dark:text-cyan-100"
          role="status"
        >
          {{ tool.comingSoonNotice }}
        </p>
      </div>
    </header>

    <slot />
  </main>
</template>
