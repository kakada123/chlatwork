<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import { useProductCopy } from "~/composables/useProductCopy";
const { isKhmer } = useLanguage();
import type { CreatorCreditTransaction } from "~/services/creator-ai.service";
import {
  creatorFeatureLabel,
  creatorTransactionLabel,
  formatCreditChange,
} from "~/lib/creator-credit-display";

const { t } = useAppI18n();

const { productText } = useProductCopy();

defineProps<{
  transactions: (CreatorCreditTransaction & {
    reason?: string | null;
    adminUserId?: string | null;
  })[];
}>();

const formatDate = (date: string) =>
  new Date(date).toLocaleString(isKhmer.value ? "km-KH" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
</script>

<template>
  <ul
    v-if="transactions.length"
    class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-white/[0.04]"
  >
    <li
      v-for="entry in transactions"
      :key="entry.id"
      class="flex items-start justify-between gap-4 p-4"
    >
      <div class="min-w-0">
        <p class="text-sm font-semibold">
          {{ productText(creatorTransactionLabel(entry.type)) }}
        </p>
        <p
          v-if="entry.feature"
          class="mt-1 text-xs text-slate-600 dark:text-white/60"
        >
          {{ productText(creatorFeatureLabel(entry.feature)) }}
        </p>
        <p
          v-if="entry.type === 'CHARGE'"
          class="mt-1 text-xs text-slate-500 dark:text-white/50"
        >
          {{ t("products.creator.reserved_credit_notice") }}
        </p>
        <p
          v-if="entry.reason"
          class="mt-1 break-words text-xs text-slate-600 dark:text-white/60"
        >
          {{ entry.reason }}
        </p>
        <p
          v-if="entry.adminUserId"
          class="mt-1 break-all text-[10px] text-slate-500 dark:text-white/40"
        >
          {{ t("products.creator.admin_id") }} {{ entry.adminUserId }}
        </p>
        <time
          :datetime="entry.createdAt"
          class="mt-1 block text-xs text-slate-400 dark:text-white/40"
          >{{ formatDate(entry.createdAt) }}</time
        >
      </div>
      <div class="shrink-0 text-right">
        <p
          class="text-sm font-bold tabular-nums"
          :class="
            entry.amount > 0
              ? 'text-emerald-700 dark:text-emerald-300'
              : entry.amount < 0
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-white/50'
          "
        >
          {{ productText(formatCreditChange(entry.amount)) }}
        </p>
        <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
          {{ t("products.creator.balance") }} {{ entry.balanceAfter.toLocaleString("en-US") }}
        </p>
      </div>
    </li>
  </ul>
  <p
    v-else
    class="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-white/50"
  >
    {{ t("products.creator.no_credit_transactions_yet") }}
  </p>
</template>
