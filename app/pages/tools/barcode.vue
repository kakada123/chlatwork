<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Barcode Generator</h1>
      <p class="text-sm text-gray-500">
        Generate barcodes (CODE128, EAN13, UPC, CODE39) and download as SVG.
      </p>
    </div>

    <BarcodeGeneratorInputCard
      v-model:value="state.value"
      v-model:format="state.format"
      v-model:height="state.height"
      v-model:width="state.width"
      v-model:display-value="state.displayValue"
      :generated="state.generated"
      :error="state.error"
      @generate="generate"
      @clear="clearAll"
      @download="downloadSvg"
    />

    <BarcodeGeneratorPreviewCard
      ref="previewRef"
      :generated="state.generated"
      :format="state.format"
      :height="state.height"
      :width="state.width"
    />
  </div>
</template>

<script setup lang="ts">
import type { BarcodeGeneratorState } from "~/lib/barcode-generator";
import {
  buildBarcodeDownloadFileName,
  createBarcodeGeneratorState,
  normalizeBarcodeValue,
  validateBarcodeValue,
} from "~/lib/barcode-generator";

useSeoMeta({
  title: "Barcode Generator — ChlatWork",
  description:
    "Generate barcodes (CODE128, EAN13, UPC, CODE39) and download as SVG.",
  ogTitle: "Barcode Generator — ChlatWork",
  ogDescription: "Generate barcodes instantly and download as SVG.",
});

type JsBarcodeFn = (element: Element, text: string, options?: any) => void;

const previewRef = ref<InstanceType<typeof BarcodeGeneratorPreviewCard> | null>(
  null,
);
const JsBarcode = ref<JsBarcodeFn | null>(null);
const isMounted = ref(false);
const state = reactive<BarcodeGeneratorState>(createBarcodeGeneratorState());

onMounted(async () => {
  isMounted.value = true;
  const module = await import("jsbarcode");
  JsBarcode.value = (module.default ?? module) as JsBarcodeFn;
});

watch(
  () => [state.format, state.height, state.width, state.displayValue],
  () => {
    if (!state.value.trim()) {
      return;
    }

    if (!import.meta.client || !isMounted.value || !JsBarcode.value) {
      return;
    }

    generate();
  },
);

function getSvgEl() {
  return previewRef.value?.getSvgEl?.() ?? null;
}

function generate() {
  state.error = "";
  state.generated = false;

  if (!import.meta.client) {
    return;
  }

  const normalizedValue = normalizeBarcodeValue(state.value, state.format);
  const validationError = validateBarcodeValue(normalizedValue, state.format);
  if (validationError) {
    state.error = validationError;
    return;
  }

  const svgEl = getSvgEl();
  if (!svgEl) {
    state.error = "Preview not ready. Try again.";
    return;
  }

  if (!JsBarcode.value) {
    state.error = "Barcode engine not ready yet. Try again.";
    return;
  }

  try {
    svgEl.innerHTML = "";

    JsBarcode.value(svgEl, normalizedValue, {
      format: state.format,
      width: state.width,
      height: state.height,
      displayValue: state.displayValue,
      margin: 10,
    });

    state.generated = true;
  } catch (error: any) {
    state.error = error?.message ?? "Failed to generate barcode.";
  }
}

function clearAll() {
  state.value = "";
  state.error = "";
  state.generated = false;

  const svgEl = getSvgEl();
  if (svgEl) {
    svgEl.innerHTML = "";
  }
}

function downloadSvg() {
  if (!import.meta.client || !state.generated) {
    return;
  }

  const svgEl = getSvgEl();
  if (!svgEl) {
    return;
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildBarcodeDownloadFileName(state.value);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
</script>
