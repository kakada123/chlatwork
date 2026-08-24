<script setup lang="ts">
import type { DeveloperCommand } from "~/types/developer-command";
import CommandCopyButton from "~/components/developer-commands/CommandCopyButton.vue";

const props = defineProps<{ item: DeveloperCommand; favorite: boolean }>();
const emit = defineEmits<{ favorite: []; copied: [command: string] }>();

const generatedCommand = computed(() => {
  let result = props.item.command;
  for (const item of props.item.variables ?? []) {
    result = result.replaceAll(`<${item.key}>`, item.defaultValue);
  }
  return result.replace(/\s*\\\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
});

const dangerDot = computed(() => ({
  safe: "bg-emerald-400 dark:bg-emerald-400/80",
  warning: "bg-amber-400 dark:bg-amber-400/80",
  danger: "bg-red-500 dark:bg-red-400/90",
}[props.item.danger]));
</script>

<template>
  <article class="group min-w-0 rounded-xl border border-slate-200/80 bg-white/85 p-2.5 shadow-sm transition hover:border-sky-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.10]">
    <div class="flex min-w-0 items-start gap-2">
      <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="dangerDot" :title="`${item.danger} command`" />
      <div class="min-w-0 flex-1">
        <code class="block truncate rounded-md bg-slate-100/80 px-1.5 py-1 font-mono text-xs font-bold text-slate-950 dark:bg-black/20 dark:text-slate-100" :title="generatedCommand">{{ generatedCommand }}</code>
        <p class="mt-1 truncate text-[11px] leading-4 text-slate-500 dark:text-white/50" :title="item.description">{{ item.description }}</p>
      </div>
      <button type="button" class="shrink-0 rounded p-1 text-sm leading-none transition hover:bg-slate-100 dark:hover:bg-white/10" :class="favorite ? 'text-amber-500 dark:text-amber-300' : 'text-slate-300 opacity-0 group-hover:opacity-100 focus:opacity-100 dark:text-white/25'" :aria-label="favorite ? 'Remove from favorites' : 'Add to favorites'" @click="emit('favorite')">★</button>
    </div>
    <div class="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-white/10">
      <span class="truncate text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-white/55">{{ item.title }}</span>
      <CommandCopyButton :command="generatedCommand" subtle @copied="emit('copied', generatedCommand)" />
    </div>
  </article>
</template>
