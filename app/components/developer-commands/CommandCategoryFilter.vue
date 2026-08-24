<script setup lang="ts">
defineProps<{ categories: readonly string[]; modelValue: string; counts: Record<string, number> }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <div class="flex gap-2 overflow-x-auto pb-2" aria-label="Command categories">
    <button
      v-for="category in ['All', ...categories]"
      :key="category"
      type="button"
      class="shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition"
      :class="modelValue === category ? 'border-sky-500 bg-sky-500 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950' : 'border-slate-200 bg-white/80 text-slate-600 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'"
      :aria-pressed="modelValue === category"
      @click="emit('update:modelValue', category)"
    >{{ category }} <span class="opacity-70">{{ category === 'All' ? counts.All : counts[category] }}</span></button>
  </div>
</template>
