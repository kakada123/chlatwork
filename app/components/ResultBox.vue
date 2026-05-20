<template>
  <div class="space-y-2">
    <div
      v-if="error"
      class="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100"
    >
      {{ error }}
    </div>

    <div
      class="rounded-xl border bg-slate-50 p-3 dark:bg-white/[0.05]"
      :class="
        text
          ? 'border-slate-200 dark:border-white/10'
          : 'border-dashed border-slate-200 dark:border-white/10'
      "
    >
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50">
          Result
        </p>

        <button
          v-if="text"
          type="button"
          @click="onCopy"
          class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.12] dark:hover:text-white"
        >
          {{ copied ? "Copied" : "Copy" }}
        </button>
      </div>

      <pre
        v-if="text"
        class="mt-2 whitespace-pre-wrap break-words text-sm text-slate-950 dark:text-white"
        >{{ text }}</pre
      >
      <p v-else class="mt-2 text-sm text-slate-400 dark:text-white/40">
        Nothing yet — run a calculation to see output here.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  text?: string;
  error?: string;
}>();

const emit = defineEmits<{
  (e: "copy"): void;
}>();

const copied = ref(false);

async function onCopy() {
  if (!props.text) return;

  emit("copy");
  copied.value = true;

  setTimeout(() => {
    copied.value = false;
  }, 1200);
}
</script>
