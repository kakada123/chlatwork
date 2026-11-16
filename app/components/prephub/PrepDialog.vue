<script setup lang="ts">
import { X } from "lucide-vue-next";
const props = defineProps<{
  open: boolean;
  title: string;
  busy?: boolean;
  error?: string;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useAppI18n();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
let previousFocus: HTMLElement | null = null;
function sync() {
  if (!dialog.value) return;
  if (props.open && !dialog.value.open) {
    previousFocus = document.activeElement as HTMLElement;
    dialog.value.showModal();
  } else if (!props.open && dialog.value.open) {
    dialog.value.close();
    previousFocus?.focus();
  }
}
onMounted(sync);
watch(
  () => props.open,
  async () => {
    await nextTick();
    sync();
  },
);
onBeforeUnmount(() => {
  dialog.value?.close();
  previousFocus?.focus();
});
</script>
<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="prep-dialog m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-xl backdrop:bg-slate-950/60 dark:border-white/15 dark:bg-neutral-950 dark:text-white"
    @cancel.prevent="!busy && emit('close')"
  >
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 :id="titleId" class="text-lg font-semibold">{{ title }}</h2>
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10"
        :aria-label="t('prephub.close')"
        :disabled="busy"
        @click="emit('close')"
      >
        <X class="size-5" aria-hidden="true" />
      </button>
    </div>
    <p
      v-if="error"
      role="alert"
      class="mb-3 text-sm text-red-600 dark:text-red-300"
    >
      {{ error }}
    </p>
    <slot v-if="open" />
  </dialog>
</template>
