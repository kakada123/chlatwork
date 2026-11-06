<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">{{ t("tools.barcode.barcodeGenerator") }}</h1>
      <p class="text-sm text-gray-500">
        {{ t("tools.barcode.generateCode128Ean13UpcAndCode39BarcodesFromNumbers") }}
      </p>
    </div>

    <BarcodeGeneratorInputCard
      v-model:value="state.value"
      v-model:format="state.format"
      v-model:height="state.height"
      v-model:width="state.width"
      v-model:display-value="state.displayValue"
      :generated="state.generated"
      :error="localizeToolError(state.error, isKhmer)"
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

    <section
      v-if="generatedItems.length > 0"
      class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">{{ t("tools.barcode.generatedBarcodes") }}</h2>
        <p class="text-xs text-gray-500">
          {{ generatedItems.length }}
          {{ t(generatedItems.length === 1 ? "tools.barcode.item.one" : "tools.barcode.item.other") }}
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="(item, index) in generatedItems"
          :key="`${item.value}-${index}`"
          class="space-y-3 rounded-xl border bg-gray-50 p-3"
        >
          <p class="truncate text-xs font-semibold text-gray-600">
            {{ item.value }}
          </p>
          <div class="overflow-auto rounded-lg border bg-white p-2">
            <div v-html="item.svg" />
          </div>
          <button
            class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            type="button"
            @click="downloadItemSvg(item.value, item.svg, index)"
          >
            {{ t("tools.barcode.downloadSvg") }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import type { BarcodeGeneratorState } from "~/lib/barcode-generator";
import {
  buildBarcodeDownloadFileName,
  createBarcodeGeneratorState,
  normalizeBarcodeValue,
  validateBarcodeValue,
} from "~/lib/barcode-generator";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.barcode.metaTitle"),
  description: () => t("tools.barcode.metaDescription"),
  ogTitle: () => t("tools.barcode.metaOgTitle"),
  ogDescription: () => t("tools.barcode.metaOgDescription"),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/barcode",
  twitterCard: "summary_large_image",
  twitterTitle: () => t("tools.barcode.metaTwitterTitle"),
  twitterDescription: () => t("tools.barcode.metaTwitterDescription"),
});

type JsBarcodeFn = (element: Element, text: string, options?: any) => void;
type GeneratedBarcodeItem = {
  value: string;
  svg: string;
};

const previewRef = ref<InstanceType<typeof BarcodeGeneratorPreviewCard> | null>(
  null,
);
const JsBarcode = ref<JsBarcodeFn | null>(null);
const isMounted = ref(false);
const state = reactive<BarcodeGeneratorState>(createBarcodeGeneratorState());
const generatedItems = ref<GeneratedBarcodeItem[]>([]);

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

function getInputLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildBarcodeSvg(value: string): string {
  if (!import.meta.client || !JsBarcode.value) {
    return "";
  }

  const serializer = new XMLSerializer();
  const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode.value(tempSvg, value, {
    format: state.format,
    width: state.width,
    height: state.height,
    displayValue: state.displayValue,
    margin: 10,
  });

  return serializer.serializeToString(tempSvg);
}

function generate() {
  state.error = "";
  state.generated = false;
  generatedItems.value = [];

  if (!import.meta.client) {
    return;
  }

  const inputLines = getInputLines(state.value);
  if (inputLines.length === 0) {
    state.error = "Please enter a value.";
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
    const builtItems: GeneratedBarcodeItem[] = [];

    for (let i = 0; i < inputLines.length; i += 1) {
      const raw = inputLines[i];
      const normalizedValue = normalizeBarcodeValue(raw, state.format);
      const validationError = validateBarcodeValue(
        normalizedValue,
        state.format,
      );
      if (validationError) {
        state.error = `Line ${i + 1}: ${validationError}`;
        return;
      }

      const svg = buildBarcodeSvg(normalizedValue);
      builtItems.push({ value: normalizedValue, svg });
    }

    const firstItem = builtItems[0];
    svgEl.textContent = "";

    JsBarcode.value(svgEl, firstItem.value, {
      format: state.format,
      width: state.width,
      height: state.height,
      displayValue: state.displayValue,
      margin: 10,
    });

    generatedItems.value = builtItems;
    state.generated = true;
  } catch (error: any) {
    state.error = error?.message ?? "Failed to generate barcode.";
  }
}

function clearAll() {
  state.value = "";
  state.error = "";
  state.generated = false;
  generatedItems.value = [];

  const svgEl = getSvgEl();
  if (svgEl) {
    svgEl.textContent = "";
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

function downloadItemSvg(value: string, svgString: string, index: number) {
  if (!import.meta.client) {
    return;
  }

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download =
    buildBarcodeDownloadFileName(value).replace(".svg", "") +
    `-${index + 1}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
</script>
