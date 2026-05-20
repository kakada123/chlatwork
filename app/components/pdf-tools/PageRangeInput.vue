<script setup lang="ts">
defineProps<{
  label: string;
  placeholder: string;
  help: string;
  pageCount?: number;
}>();

const model = defineModel<string>({ required: true });
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <label class="text-sm font-bold text-slate-950 dark:text-white">
        {{ label }}
      </label>
      <span v-if="pageCount" class="text-xs text-slate-500 dark:text-white/50">
        {{ pageCount }} pages
      </span>
    </div>

    <input
      v-model="model"
      class="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
      :placeholder="placeholder"
    />
    <p class="text-xs text-slate-500 dark:text-white/50">{{ help }}</p>
  </div>
</template>
