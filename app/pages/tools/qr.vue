<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">QR Generator</h1>
      <p class="text-sm text-gray-500">
        Generate QR codes for text/URL and download as PNG (no upload, no API).
        Enter each value and click Generate to add multiple items.
      </p>
    </div>

    <QrGeneratorInputCard
      v-model:text="state.text"
      v-model:size="state.size"
      v-model:margin="state.margin"
      v-model:ec-level="state.ecLevel"
      v-model:auto-generate="state.autoGenerate"
      :generated="state.generated"
      :error="state.error"
      @generate="generate"
      @clear="clearAll"
      @download="downloadPng"
    />

    <QrGeneratorPreviewCard
      ref="previewRef"
      :generated="state.generated"
      :size="state.size"
      :margin="state.margin"
      :ec-level="state.ecLevel"
    />

    <section
      v-if="generatedItems.length > 0"
      class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold">Generated QR codes</h2>
        <p class="text-xs text-gray-500">
          {{ generatedItems.length }}
          {{ generatedItems.length > 1 ? "items" : "item" }}
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="(item, index) in generatedItems"
          :key="`${item.text}-${index}`"
          class="space-y-3 rounded-xl border bg-gray-50 p-3"
        >
          <p class="line-clamp-2 text-xs font-semibold text-gray-600">
            {{ item.text }}
          </p>
          <div
            class="flex items-center justify-center rounded-lg border bg-white p-3"
          >
            <img
              :src="item.dataUrl"
              :alt="`QR code ${index + 1}`"
              class="h-44 w-44"
              loading="lazy"
            />
          </div>
          <button
            class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            type="button"
            @click="downloadItemPng(item.text, item.dataUrl, index)"
          >
            Download PNG
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { QrGeneratorState } from "~/lib/qr-generator";
import {
  buildQrDownloadFileName,
  createQrGeneratorState,
  validateQrText,
} from "~/lib/qr-generator";

useSeoMeta({
  title: "QR Code Generator Online - Free PNG Download | ChlatWork",
  description:
    "Generate a QR code for URLs, menus, Telegram links, forms, or plain text and download it as a PNG in your browser.",
  ogTitle: "QR Code Generator Online - Free PNG Download | ChlatWork",
  ogDescription:
    "Create QR codes for menus, links, forms, and notes, then download a PNG you can test and print.",
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/qr",
  twitterCard: "summary_large_image",
  twitterTitle: "QR Code Generator Online - Free PNG Download | ChlatWork",
  twitterDescription:
    "Generate QR codes for URLs, menus, Telegram links, forms, or plain text in your browser.",
});

type QRCodeLib = typeof import("qrcode");
type GeneratedQrItem = {
  text: string;
  dataUrl: string;
};

const previewRef = ref<InstanceType<typeof QrGeneratorPreviewCard> | null>(
  null,
);
const isMounted = ref(false);
const QR = ref<QRCodeLib | null>(null);
const state = reactive<QrGeneratorState>(createQrGeneratorState());
const generatedItems = ref<GeneratedQrItem[]>([]);

onMounted(async () => {
  isMounted.value = true;
  QR.value = (await import("qrcode")) as QRCodeLib;
});

watch(
  () => [
    state.text,
    state.size,
    state.margin,
    state.ecLevel,
    state.autoGenerate,
  ],
  () => {
    if (!state.autoGenerate) {
      return;
    }

    if (!state.text.trim()) {
      clearCanvasOnly();
      state.generated = false;
      state.error = "";
      return;
    }

    if (!import.meta.client || !isMounted.value || !QR.value) {
      return;
    }

    void generate();
  },
);

function getCanvasEl() {
  return previewRef.value?.getCanvasEl?.() ?? null;
}

function getInputLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function clearCanvasOnly() {
  const canvasEl = getCanvasEl();
  if (!canvasEl) {
    return;
  }

  const context = canvasEl.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvasEl.width, canvasEl.height);
}

function clearAll() {
  state.text = "";
  state.error = "";
  state.generated = false;
  generatedItems.value = [];
  clearCanvasOnly();
}

async function generate() {
  state.error = "";
  state.generated = false;
  generatedItems.value = [];

  if (!import.meta.client) {
    return;
  }

  const inputLines = getInputLines(state.text);
  if (inputLines.length === 0) {
    state.error = "Please enter text or URL.";
    return;
  }

  const canvasEl = getCanvasEl();
  if (!canvasEl) {
    state.error = "Preview not ready. Try again.";
    return;
  }

  if (!QR.value) {
    state.error = "QR engine not ready yet. Try again.";
    return;
  }

  try {
    const builtItems: GeneratedQrItem[] = [];

    for (let i = 0; i < inputLines.length; i += 1) {
      const text = inputLines[i];
      const validationError = validateQrText(text);
      if (validationError) {
        state.error = `Line ${i + 1}: ${validationError}`;
        return;
      }

      const dataUrl = await QR.value.toDataURL(text, {
        width: state.size,
        margin: state.margin,
        errorCorrectionLevel: state.ecLevel,
      });

      builtItems.push({ text, dataUrl });
    }

    const firstItem = builtItems[0];
    canvasEl.width = state.size;
    canvasEl.height = state.size;

    await QR.value.toCanvas(canvasEl, firstItem.text, {
      width: state.size,
      margin: state.margin,
      errorCorrectionLevel: state.ecLevel,
    });

    generatedItems.value = builtItems;
    state.generated = true;
  } catch (error: any) {
    state.error = error?.message ?? "Failed to generate QR code.";
  }
}

function downloadPng() {
  if (!import.meta.client || !state.generated) {
    return;
  }

  const canvasEl = getCanvasEl();
  if (!canvasEl) {
    return;
  }

  const url = canvasEl.toDataURL("image/png");
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = buildQrDownloadFileName(state.text);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function downloadItemPng(text: string, dataUrl: string, index: number) {
  if (!import.meta.client) {
    return;
  }

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download =
    buildQrDownloadFileName(text).replace(".png", "") + `-${index + 1}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
</script>
