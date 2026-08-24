<script setup lang="ts">
import type { CommandPlatform } from "~/types/developer-command";
defineProps<{ modelValue: "all" | CommandPlatform; counts: Record<CommandPlatform, number> }>();
const emit = defineEmits<{ "update:modelValue": [value: "all" | CommandPlatform] }>();
const platforms = [{ value: "all", label: "All" }, { value: "macos", label: "macOS" }, { value: "linux", label: "Linux" }, { value: "windows", label: "Windows" }] as const;
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-white/45">Platform</legend>
    <div class="inline-flex rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-950/70">
      <button v-for="item in platforms" :key="item.value" type="button" class="rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35" :class="modelValue === item.value ? 'bg-slate-900 text-white shadow-sm dark:bg-cyan-500 dark:text-slate-950' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'" :disabled="item.value !== 'all' && counts[item.value] === 0" :aria-pressed="modelValue === item.value" @click="emit('update:modelValue', item.value)">{{ item.label }}<span v-if="item.value !== 'all'" class="ml-1 text-[10px] opacity-60">{{ counts[item.value] }}</span></button>
    </div>
  </fieldset>
</template>
