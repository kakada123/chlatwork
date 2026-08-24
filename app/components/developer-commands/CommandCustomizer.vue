<script setup lang="ts">
import type { CommandVariable } from "~/types/developer-command";
defineProps<{ variables: CommandVariable[]; values: Record<string, string> }>();
const emit = defineEmits<{ change: [key: string, value: string] }>();
</script>

<template>
  <div class="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 dark:border-slate-700">
    <label v-for="item in variables" :key="item.key" class="block text-xs font-bold text-slate-600 dark:text-white/60">
      {{ item.label }}
      <select v-if="item.options" :value="values[item.key]" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-cyan-500" @change="emit('change', item.key, ($event.target as HTMLSelectElement).value)">
        <option v-for="option in item.options" :key="option" :value="option">{{ option || 'Include tests' }}</option>
      </select>
      <input v-else :value="values[item.key]" type="text" spellcheck="false" :placeholder="item.placeholder" class="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm font-normal text-slate-900 outline-none focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-600 dark:focus:border-cyan-500" @input="emit('change', item.key, ($event.target as HTMLInputElement).value)" />
    </label>
  </div>
</template>
