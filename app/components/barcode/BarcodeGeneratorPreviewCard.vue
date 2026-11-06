<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
const { isKhmer } = useLanguage();
import type { BarcodeFormat } from "~/lib/barcode-generator";

const { t } = useAppI18n();

defineProps<{
  generated: boolean;
  format: BarcodeFormat;
  height: number;
  width: number;
}>();

const svgEl = ref<SVGSVGElement | null>(null);

defineExpose({
  getSvgEl: () => svgEl.value,
});
</script>

<template>
  <section class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold">{{ t("tools.barcode.preview") }}</h2>
      <p v-if="generated" class="text-xs text-gray-500">
        {{ format }} • {{ t("tools.barcode.h") }}{{ height }} • {{ t("tools.barcode.w") }}{{ width }}
      </p>
    </div>

    <div
      class="flex min-h-[200px] items-center justify-center rounded-xl bg-gray-50 p-4"
    >
      <div class="rounded-xl border bg-white p-4">
        <svg ref="svgEl"></svg>

        <p v-if="!generated" class="mt-3 text-center text-sm text-gray-400">{{ t("tools.barcode.generateABarcodeToPreviewHere") }}</p>
      </div>
    </div>
  </section>
</template>
