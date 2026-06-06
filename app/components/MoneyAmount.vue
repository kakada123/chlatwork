<script setup lang="ts">
import type { MoneyCurrency } from "~/lib/money";
import { formatMoneyAmountDisplay, moneyTone } from "~/lib/money";

const props = withDefaults(
  defineProps<{
    value: unknown;
    currency: MoneyCurrency;
    showPositiveSign?: boolean;
    wrap?: boolean;
  }>(),
  {
    showPositiveSign: false,
    wrap: false,
  },
);

const amount = computed(() =>
  formatMoneyAmountDisplay(props.value, props.currency),
);
const tone = computed(() => moneyTone(props.value));
const signPrefix = computed(() =>
  props.showPositiveSign && tone.value === "positive" ? "+" : "",
);
const displayValue = computed(() => `${signPrefix.value}${amount.value.value}`);
const fullValue = computed(() => `${signPrefix.value}${amount.value.full}`);
</script>

<template>
  <span
    class="money-amount"
    :class="{ 'money-amount-wrap': props.wrap }"
    :title="fullValue"
    :aria-label="fullValue"
  >
    {{ displayValue }}
  </span>
</template>
