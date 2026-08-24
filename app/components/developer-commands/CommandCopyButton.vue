<script setup lang="ts">
const props = withDefaults(defineProps<{ command: string; subtle?: boolean }>(), {
  subtle: false,
});
const emit = defineEmits<{ copied: [] }>();
const copied = ref(false);
let resetTimer: ReturnType<typeof setTimeout> | undefined;

async function copyCommand() {
  try {
    await navigator.clipboard.writeText(props.command);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = props.command;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  copied.value = true;
  emit("copied");
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => (copied.value = false), 1400);
}

onBeforeUnmount(() => resetTimer && clearTimeout(resetTimer));
</script>

<template>
  <button
    type="button"
    class="h-8 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-sky-400 dark:focus:ring-sky-400"
    :class="subtle
      ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-300 hover:text-sky-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.12] dark:hover:text-white'
      : 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400'"
    :aria-label="copied ? 'Command copied' : 'Copy command'"
    @click="copyCommand"
  >
    {{ copied ? "Copied!" : "Copy" }}
  </button>
</template>
