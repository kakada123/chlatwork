<script setup lang="ts">
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import QuickExpenseForm from "~/components/expense-tracker/QuickExpenseForm.vue";

defineProps<{
  currency: ExpenseCurrency;
  busy: boolean;
  saving: boolean;
  signedIn: boolean;
}>();
const emit = defineEmits<{ (event: "quick-add", row: ExpenseRow): void }>();
const quickForm = ref<{ resetForm: () => void } | null>(null);
defineExpose({ resetQuickForm: () => quickForm.value?.resetForm() });
</script>

<template>
  <section
    class="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6"
    aria-label="Add an expense"
  >
    <div class="mb-5 hidden items-start justify-between gap-3 sm:flex">
      <div>
        <p
          class="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-cyan-200"
        >
          Fast entry
        </p>
        <h2 class="mt-1 text-xl font-black text-slate-950 dark:text-white">
          Add an expense
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
          {{
            signedIn
              ? "Enter the amount now. Your account saves it automatically."
              : "Enter the amount now, then sign in to save it."
          }}
        </p>
      </div>
    </div>
    <QuickExpenseForm
      ref="quickForm"
      :currency="currency"
      :busy="busy || saving"
      @submit="emit('quick-add', $event)"
    />
  </section>
</template>
