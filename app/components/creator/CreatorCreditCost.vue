<script setup lang="ts">
import { Coins } from "lucide-vue-next";

const props = defineProps<{
  credits: number;
  dynamic?: boolean;
  durationLabel?: string;
  balance?: number | null;
}>();

const creditLabel = computed(
  () => `${props.credits} credit${props.credits === 1 ? "" : "s"}`,
);
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-white/50"
  >
    <span v-if="durationLabel">Video: {{ durationLabel }}</span>
    <span
      class="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-white/65"
    >
      <Coins class="size-4" aria-hidden="true" />
      {{ dynamic ? "Estimated cost" : "Cost" }}: {{ creditLabel }}
    </span>
    <span v-if="balance !== undefined && balance !== null"
      >{{ balance }} credits remaining</span
    >
  </div>
</template>
