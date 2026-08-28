<script setup lang="ts">
import { CheckCircle2, Plus, ReceiptText, X } from "lucide-vue-next";
import QuickExpenseForm from "~/components/expense-tracker/QuickExpenseForm.vue";
import { useAuth } from "~/composables/useAuth";
import { useQuickExpense } from "~/composables/useQuickExpense";
import {
  EXPENSE_SAVE_MOTIVATION,
  type ExpenseRow,
} from "~/lib/expense-tracker";

type QuickExpenseFormHandle = {
  focusAmount: () => void;
  resetForm: () => void;
};

type QuickExpenseResponse = {
  row: ExpenseRow;
};

const props = withDefaults(defineProps<{
  mobileNavigationAction?: boolean;
}>(), {
  mobileNavigationAction: false,
});

const { user } = useAuth();
const {
  currency,
  enabled,
  refreshSettings,
} = useQuickExpense();
const isOpen = ref(false);
const isSaving = ref(false);
const error = ref("");
const savedNotice = ref(false);
const dialog = ref<HTMLDivElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const form = ref<QuickExpenseFormHandle | null>(null);
const visualViewportHeight = ref<number | null>(null);
const visualViewportOffsetTop = ref(0);
const shouldShowTrigger = computed(
  () => enabled.value && !isOpen.value,
);
const dialogViewportStyle = computed(() => visualViewportHeight.value
  ? {
      height: `${visualViewportHeight.value}px`,
      transform: `translateY(${visualViewportOffsetTop.value}px)`,
    }
  : undefined);
const dialogPanelStyle = computed(() => visualViewportHeight.value
  ? { maxHeight: `${Math.max(0, visualViewportHeight.value - 8)}px` }
  : undefined);
let lockedScrollY = 0;
let previousBodyStyles: {
  overflow: string;
  position: string;
  top: string;
  width: string;
} | null = null;
let noticeTimer: ReturnType<typeof setTimeout> | null = null;

function syncVisualViewport() {
  const viewport = window.visualViewport;
  visualViewportHeight.value = viewport?.height ?? window.innerHeight;
  visualViewportOffsetTop.value = viewport?.offsetTop ?? 0;
}

function lockPageScroll() {
  if (previousBodyStyles) return;
  lockedScrollY = window.scrollY;
  previousBodyStyles = {
    overflow: document.body.style.overflow,
    position: document.body.style.position,
    top: document.body.style.top,
    width: document.body.style.width,
  };
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.width = "100%";
}

function unlockPageScroll() {
  if (!previousBodyStyles) return;
  const styles = previousBodyStyles;
  previousBodyStyles = null;
  document.body.style.overflow = styles.overflow;
  document.body.style.position = styles.position;
  document.body.style.top = styles.top;
  document.body.style.width = styles.width;
  window.scrollTo({ top: lockedScrollY, behavior: "instant" });
}

function openDialog() {
  error.value = "";
  isOpen.value = true;
}

function closeDialog() {
  if (isSaving.value) return;
  isOpen.value = false;
}

function keepFocusInside(event: KeyboardEvent) {
  if (event.key !== "Tab" || !dialog.value) return;
  const focusable = Array.from(dialog.value.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
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

async function saveQuickExpense(row: ExpenseRow) {
  isSaving.value = true;
  error.value = "";

  try {
    const result = await $fetch<QuickExpenseResponse>("/api/expenses/quick-entry", {
      method: "POST",
      body: {
        amount: row.amount,
        category: row.category,
        date: row.date,
        note: row.note,
      },
    });

    // The open tracker mirrors this append so its later full-state save cannot discard it.
    window.dispatchEvent(new CustomEvent("chlatwork:quick-expense-saved", {
      detail: result.row,
    }));
    form.value?.resetForm();
    isOpen.value = false;
    savedNotice.value = true;
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      savedNotice.value = false;
      noticeTimer = null;
    }, 2200);
  } catch (caught) {
    const statusMessage = (caught as { data?: { statusMessage?: string } })?.data?.statusMessage;
    error.value = statusMessage || "Could not save this expense. Please try again.";
  } finally {
    isSaving.value = false;
  }
}

watch(
  () => user.value?.id,
  (userId) => {
    if (userId) void refreshSettings(true);
  },
  { immediate: true },
);

watch(isOpen, async (open) => {
  if (!import.meta.client) return;
  if (open) {
    syncVisualViewport();
    lockPageScroll();
    await nextTick();
    form.value?.focusAmount();
    requestAnimationFrame(() => {
      syncVisualViewport();
      dialog.value?.scrollTo({ top: 0, behavior: "instant" });
    });
    return;
  }
  unlockPageScroll();
  await nextTick();
  trigger.value?.focus();
});

onMounted(() => {
  window.visualViewport?.addEventListener("resize", syncVisualViewport);
  window.visualViewport?.addEventListener("scroll", syncVisualViewport);
});

onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer);
  if (import.meta.client) {
    window.visualViewport?.removeEventListener("resize", syncVisualViewport);
    window.visualViewport?.removeEventListener("scroll", syncVisualViewport);
    unlockPageScroll();
  }
});
</script>

<template>
  <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-2 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-2 opacity-0">
    <div
      v-if="savedNotice"
      role="status"
      class="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[115] inline-flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl dark:bg-white dark:text-slate-950 sm:right-6 sm:max-w-sm"
    >
      <CheckCircle2 class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
      <span>
        <span class="block">Expense saved</span>
        <span class="mt-1 block text-xs font-medium leading-5 text-white/70 dark:text-slate-600">
          {{ EXPENSE_SAVE_MOTIVATION }}
        </span>
      </span>
    </div>
  </Transition>

  <Transition enter-active-class="transition duration-200" enter-from-class="translate-y-3 opacity-0" leave-active-class="transition duration-150" leave-to-class="translate-y-3 opacity-0">
    <button
      v-if="shouldShowTrigger"
      ref="trigger"
      type="button"
      class="fixed z-[90] inline-flex items-center bg-sky-600 font-black text-white shadow-[0_14px_35px_rgba(2,132,199,0.38)] transition hover:-translate-y-0.5 hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 dark:bg-cyan-200 dark:text-slate-950 dark:shadow-[0_14px_35px_rgba(103,232,249,0.2)] dark:hover:bg-cyan-100"
      :class="props.mobileNavigationAction
        ? 'bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-1/2 size-14 -translate-x-1/2 justify-center rounded-full border-4 border-white p-0 dark:border-black sm:bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-6 sm:h-auto sm:w-auto sm:min-h-14 sm:translate-x-0 sm:gap-2 sm:rounded-2xl sm:border-0 sm:px-4 sm:py-3'
        : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 min-h-14 gap-2 rounded-2xl px-4 py-3 sm:right-6'"
      aria-label="Add expense"
      aria-haspopup="dialog"
      @click="openDialog"
    >
      <span class="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 dark:bg-slate-950/10" aria-hidden="true">
        <ReceiptText class="h-5 w-5" />
        <Plus class="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-white p-0.5 text-sky-700 dark:bg-slate-950 dark:text-cyan-200" />
      </span>
      <span class="hidden sm:inline">Quick expense</span>
      <span v-if="!props.mobileNavigationAction" class="sm:hidden">Add expense</span>
    </button>
  </Transition>

  <Teleport to="body">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
      <div
        v-if="isOpen"
        class="fixed inset-x-0 top-0 z-[120] flex h-[100dvh] items-end overflow-hidden bg-slate-950/65 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
        :style="dialogViewportStyle"
        @click.self="closeDialog"
      >
        <div
          ref="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-expense-dialog-title"
          class="max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-slate-200 bg-white px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl outline-none dark:border-white/15 dark:bg-[#101214] sm:max-w-xl sm:rounded-3xl sm:p-6"
          :style="dialogPanelStyle"
          @keydown.esc.prevent="closeDialog"
          @keydown="keepFocusInside"
        >
          <div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-white/15 sm:hidden" aria-hidden="true" />
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-cyan-200">Stay on track</p>
              <h2 id="quick-expense-dialog-title" class="mt-1 text-2xl font-black text-slate-950 dark:text-white">Add an expense</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-white/50">A quick entry now keeps your money clear later.</p>
            </div>
            <button
              type="button"
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close quick expense"
              :disabled="isSaving"
              @click="closeDialog"
            >
              <X class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <QuickExpenseForm
            ref="form"
            :currency="currency"
            :busy="isSaving"
            submit-label="Save expense"
            @submit="saveQuickExpense"
          />

          <p v-if="error" role="alert" class="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:bg-red-400/10 dark:text-red-300">
            {{ error }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
