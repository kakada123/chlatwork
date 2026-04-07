<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">QR Generator</h1>
      <p class="text-sm text-gray-500">
        Generate QR codes for text/URL and download as PNG (no upload, no API).
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
  title: "QR Generator — ChlatWork",
  description: "Generate QR codes for text/URL and download as PNG.",
  ogTitle: "QR Generator — ChlatWork",
  ogDescription: "Generate QR codes instantly and download as PNG.",
});

type QRCodeLib = typeof import("qrcode");

const previewRef = ref<InstanceType<typeof QrGeneratorPreviewCard> | null>(null);
const isMounted = ref(false);
const QR = ref<QRCodeLib | null>(null);
const state = reactive<QrGeneratorState>(createQrGeneratorState());

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
  clearCanvasOnly();
}

async function generate() {
  state.error = "";
  state.generated = false;

  if (!import.meta.client) {
    return;
  }

  const text = state.text.trim();
  const validationError = validateQrText(text);
  if (validationError) {
    state.error = validationError;
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
    canvasEl.width = state.size;
    canvasEl.height = state.size;

    await QR.value.toCanvas(canvasEl, text, {
      width: state.size,
      margin: state.margin,
      errorCorrectionLevel: state.ecLevel,
    });

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
</script>
