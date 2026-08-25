<script setup lang="ts">
import { AlertTriangle, X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    busy?: boolean;
    busyLabel?: string;
    locale?: "en" | "km";
  }>(),
  { cancelLabel: "Cancel", busy: false, busyLabel: "Please wait…", locale: "en" },
);
const emit = defineEmits<{ close: []; confirm: [] }>();
const dialog = ref<HTMLDivElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);
const titleId = useId();
const descriptionId = useId();
let previousOverflow = "";
let previouslyFocused: HTMLElement | null = null;

function close() {
  if (!props.busy) emit("close");
}

function keepFocusInside(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  ));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}

watch(() => props.open, async (open) => {
  if (!import.meta.client) return;
  if (open) {
    previouslyFocused = document.activeElement as HTMLElement | null;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    await nextTick();
    // Defaulting to Cancel prevents an accidental destructive Enter press.
    cancelButton.value?.focus();
    return;
  }
  document.body.style.overflow = previousOverflow;
  previouslyFocused?.focus();
});

onBeforeUnmount(() => {
  if (!import.meta.client) return;
  document.body.style.overflow = previousOverflow;
  previouslyFocused?.focus();
});
</script>

<template>
  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div v-if="open" class="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" @click.self="close">
        <div ref="dialog" role="alertdialog" aria-modal="true" :aria-labelledby="titleId" :aria-describedby="descriptionId" class="confirm-dialog w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-white/15 dark:bg-[#101214] sm:p-7" :class="{ 'is-khmer': locale === 'km' }" :lang="locale" @keydown.esc.prevent="close" @keydown="keepFocusInside">
          <div class="flex items-start justify-between gap-4">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-300/15"><AlertTriangle class="h-6 w-6" aria-hidden="true" /></span>
            <button type="button" class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white" :aria-label="cancelLabel" :disabled="busy" @click="close"><X class="h-5 w-5" aria-hidden="true" /></button>
          </div>
          <h2 :id="titleId" class="mt-5 text-2xl font-semibold text-slate-950 dark:text-white">{{ title }}</h2>
          <p :id="descriptionId" class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">{{ description }}</p>
          <div class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button ref="cancelButton" type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/[0.07]" :disabled="busy" @click="close">{{ cancelLabel }}</button>
            <button type="button" class="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400 dark:focus-visible:ring-offset-[#101214]" :disabled="busy" @click="emit('confirm')">{{ busy ? busyLabel : confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-dialog.is-khmer { font-family: "Hanuman", ui-sans-serif, system-ui, sans-serif; }
.confirm-dialog.is-khmer h2,
.confirm-dialog.is-khmer p,
.confirm-dialog.is-khmer button { line-height: 1.7; letter-spacing: 0; }
</style>
