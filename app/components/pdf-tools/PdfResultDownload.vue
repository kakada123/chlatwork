<script setup lang="ts">
import { downloadBlob, formatFileSize } from "~/lib/pdf-tools";

const props = defineProps<{
  results: Array<{
    name: string;
    blob: Blob;
    url: string;
    pageNumber?: number;
  }>;
}>();
</script>

<template>
  <section
    v-if="props.results.length"
    class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
  >
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold text-slate-950 dark:text-white">Result</h2>
      <span class="text-xs text-slate-500 dark:text-white/50">
        {{ props.results.length }} file{{ props.results.length === 1 ? "" : "s" }} ready
      </span>
    </div>

    <div class="grid gap-2">
      <div
        v-for="result in props.results"
        :key="result.url"
        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.05]"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {{ result.name }}
          </span>
          <span class="text-xs text-slate-500 dark:text-white/50">
            {{ formatFileSize(result.blob.size) }}
          </span>
        </span>

        <button
          type="button"
          class="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950"
          @click="downloadBlob(result.blob, result.name)"
        >
          Download
        </button>
      </div>
    </div>
  </section>
</template>
