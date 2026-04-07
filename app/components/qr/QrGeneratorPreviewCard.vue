<script setup lang="ts">
import type { QrEcLevel } from "~/lib/qr-generator";

defineProps<{
  generated: boolean;
  size: number;
  margin: number;
  ecLevel: QrEcLevel;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);

defineExpose({
  getCanvasEl: () => canvasEl.value,
});
</script>

<template>
  <section class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold">Preview</h2>
      <p v-if="generated" class="text-xs text-gray-500">
        {{ size }}px • EC {{ ecLevel }} • margin {{ margin }}
      </p>
    </div>

    <div
      class="flex min-h-[240px] items-center justify-center rounded-xl bg-gray-50 p-4"
    >
      <div class="rounded-xl border bg-white p-4">
        <canvas ref="canvasEl"></canvas>

        <p v-if="!generated" class="mt-3 text-center text-sm text-gray-400">
          Generate a QR code to preview here.
        </p>
      </div>
    </div>
  </section>
</template>
