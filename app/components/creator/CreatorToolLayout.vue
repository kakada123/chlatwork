<script setup lang="ts">
import type { CreatorToolDefinition } from "~/data/creator-tools";

defineProps<{
  tool: CreatorToolDefinition;
  hasResult: boolean;
}>();
</script>

<template>
  <main
    class="mx-auto w-full max-w-[1180px] space-y-5 text-slate-950 dark:text-white"
  >
    <CreatorToolHeader :tool="tool" />
    <div
      class="grid min-w-0 gap-4"
      :class="
        hasResult
          ? 'lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start'
          : 'lg:grid-cols-[minmax(0,760px)] lg:justify-center'
      "
    >
      <section
        class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-5"
        aria-label="Creator input"
      >
        <slot name="input" />
      </section>
      <section
        v-if="hasResult"
        class="min-w-0 lg:sticky lg:top-24"
        aria-label="Generated result"
      >
        <slot name="result" />
      </section>
    </div>
  </main>
</template>
