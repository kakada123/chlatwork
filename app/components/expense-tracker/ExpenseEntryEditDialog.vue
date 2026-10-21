<script setup lang="ts">
import { X } from "lucide-vue-next";
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import QuickExpenseForm from "./QuickExpenseForm.vue";

const props = defineProps<{
  row: ExpenseRow;
  currency: ExpenseCurrency;
  busy: boolean;
  error: string;
}>();
const emit = defineEmits<{ close: []; save: [row: ExpenseRow] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const form = ref<{ focusAmount: () => void } | null>(null);
const titleId = useId();
const viewportHeight = ref<number | null>(null);
const viewportOffset = ref(0);
let previouslyFocused: HTMLElement | null = null;
let scrollY = 0;
let previousBodyStyles: {
  overflow: string;
  position: string;
  top: string;
  width: string;
} | null = null;

function close() {
  if (!props.busy) emit("close");
}
function syncViewport() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight;
  viewportOffset.value = window.visualViewport?.offsetTop ?? 0;
}

onMounted(async () => {
  previouslyFocused = document.activeElement as HTMLElement | null;
  scrollY = window.scrollY;
  previousBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
  };
  // Fixed-body locking and visual viewport sizing keep the edit sheet usable above the mobile keyboard.
  Object.assign(document.body.style, {
    overflow: "hidden",
    position: "fixed",
    top: `-${scrollY}px`,
    width: "100%",
  });
  syncViewport();
  window.visualViewport?.addEventListener("resize", syncViewport);
  window.visualViewport?.addEventListener("scroll", syncViewport);
  dialog.value?.showModal();
  await nextTick();
  form.value?.focusAmount();
});
onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener("resize", syncViewport);
  window.visualViewport?.removeEventListener("scroll", syncViewport);
  dialog.value?.close();
  if (previousBodyStyles)
    Object.assign(document.body.style, previousBodyStyles);
  window.scrollTo({ top: scrollY, behavior: "instant" });
  previouslyFocused?.focus({ preventScroll: true });
});
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      :aria-labelledby="titleId"
      aria-modal="true"
      class="fixed inset-x-0 top-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-slate-950 backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm dark:text-white"
      :style="
        viewportHeight
          ? {
              height: `${viewportHeight}px`,
              transform: `translateY(${viewportOffset}px)`,
            }
          : undefined
      "
      @cancel.prevent="close"
    >
      <div
        class="flex h-full items-end sm:items-center sm:justify-center sm:p-4"
        @click.self="close"
      >
        <div
          class="max-h-full w-full overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl dark:border-white/15 dark:bg-[#101214] sm:max-w-xl sm:rounded-3xl sm:p-6"
        >
          <div
            class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/15 sm:hidden"
            aria-hidden="true"
          />
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p
                class="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-cyan-200"
              >
                {{ row.date }}
              </p>
              <h2 :id="titleId" class="mt-1 text-2xl font-black">
                {{ row.type === "income" ? "Edit income" : "Edit expense" }}
              </h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
                Update the details, then save your changes.
              </p>
            </div>
            <button
              type="button"
              :disabled="busy"
              aria-label="Close entry editor"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10"
              @click="close"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <fieldset :disabled="busy" class="min-w-0">
            <QuickExpenseForm
              ref="form"
              :initial-row="row"
              :currency="currency"
              :busy="busy"
              submit-label="Save changes"
              @submit="emit('save', $event)"
            />
          </fieldset>
          <p
            v-if="error"
            role="alert"
            class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300"
          >
            {{ error }}
          </p>
          <button
            type="button"
            :disabled="busy"
            class="mt-4 min-h-11 w-full rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-50 dark:border-white/15 dark:text-white/65"
            @click="close"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
