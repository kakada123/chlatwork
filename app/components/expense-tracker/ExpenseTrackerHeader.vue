<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
const { t } = useAppI18n();
</script>

<template>
  <header class="mb-6 hidden sm:block">
    <h1 class="text-xl font-bold leading-tight">{{ t("products.expenses.expense_tracker") }}</h1>
    <p class="mt-2 max-w-xl text-gray-600 dark:text-white/60">
      {{ t("products.expenses.track_your_spending_with_budget_and_insights_saved_securely_to_your_account") }}
    </p>
  </header>
</template>
