<script setup lang="ts">
import type { DeveloperGuideCommand } from "~/data/developer-guides";

const props = defineProps<{ snippet: DeveloperGuideCommand }>();
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copyCommand() {
  if (!import.meta.client) return;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(props.snippet.command);
  } else {
    const textarea = document.createElement("textarea");
    textarea.value = props.snippet.command;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1600);
}

onBeforeUnmount(() => clearTimeout(copiedTimer));
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 dark:border-slate-700 dark:bg-slate-950">
    <div v-if="snippet.label || snippet.risk" class="flex items-center justify-between border-b border-white/10 px-3 py-2">
      <span class="text-xs font-bold text-slate-400">{{ snippet.label || snippet.language || "Command" }}</span>
      <span v-if="snippet.risk && snippet.risk !== 'safe'" :class="snippet.risk === 'danger' ? 'text-red-300' : 'text-amber-300'" class="text-[11px] font-black uppercase">{{ snippet.risk }}</span>
    </div>
    <div class="flex items-start gap-2 p-3">
      <pre class="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-slate-100"><code>{{ snippet.command }}</code></pre>
      <button type="button" class="shrink-0 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-300" :aria-label="`Copy ${snippet.label || 'command'}`" @click="copyCommand">
        {{ copied ? "Copied!" : "Copy" }}
      </button>
    </div>
  </div>
</template>
