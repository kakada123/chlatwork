<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { ExpenseCurrency, ExpenseRow } from "~/lib/expense-tracker";
import QuickExpenseForm from "~/components/expense-tracker/QuickExpenseForm.vue";

const { t } = useAppI18n();


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
    :aria-label="t(&quot;products.expenses.add_an_expense&quot;)"
  >
    <div class="mb-5 hidden items-start justify-between gap-3 sm:flex">
      <div>
        <p
          class="text-xs font-black uppercase tracking-[0.18em] text-sky-600 dark:text-cyan-200"
        >
          {{ t("products.expenses.fast_entry") }}
        </p>
        <h2 class="mt-1 text-xl font-black text-slate-950 dark:text-white">
          {{ t("products.expenses.add_an_expense") }}
        </h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/50">
          {{
            signedIn
              ? t("products.expenses.enter_the_amount_now_your_account_saves_it_automatically")
              : t("products.expenses.enter_the_amount_now_then_sign_in_to_save_it")
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
