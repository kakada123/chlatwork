<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { Coins } from "lucide-vue-next";

const { t } = useAppI18n();

const { productText } = useProductCopy();

const props = defineProps<{
  credits: number;
  dynamic?: boolean;
  durationLabel?: string;
  balance?: number | null;
}>();

const creditLabel = computed(
  () => `${props.credits} ${productText(props.credits === 1 ? "credit" : "credits")}`,
);
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-white/50"
  >
    <span v-if="durationLabel">{{ t("products.creator.video") }} {{ durationLabel }}</span>
    <span
      class="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-white/65"
    >
      <Coins class="size-4" aria-hidden="true" />
      {{ dynamic ? t("products.creator.estimated_cost") : t("products.creator.cost") }}: {{ creditLabel }}
    </span>
    <span v-if="balance !== undefined && balance !== null"
      >{{ balance }} {{ t("products.creator.credits_remaining") }}</span
    >
  </div>
</template>
