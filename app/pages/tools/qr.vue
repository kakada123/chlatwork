<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">QR Generator</h1>
      <p class="text-sm text-gray-500">
        Generate QR codes for text/URL and download as PNG (no upload, no API).
      </p>
    </div>

    <section class="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <h2 class="text-sm font-semibold">Input</h2>

      <div class="grid gap-3 md:grid-cols-2">
        <div class="space-y-2">
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Text / URL
          </label>

          <textarea
            v-model="state.text"
            rows="5"
            class="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="e.g. https://chlatwork.com or any text…"
          />

          <div class="flex gap-2">
            <button
              @click="generate()"
              class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Generate
            </button>

            <button
              @click="clearAll()"
              class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Clear
            </button>

            <button
              @click="downloadPng()"
              :disabled="!state.generated"
              class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download PNG
            </button>
          </div>

          <p v-if="state.error" class="text-sm text-red-600">
            {{ state.error }}
          </p>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold">Options</h3>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Size (px)
              </label>
              <input
                v-model.number="state.size"
                type="number"
                min="160"
                max="1024"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Margin
              </label>
              <input
                v-model.number="state.margin"
                type="number"
                min="0"
                max="10"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div>
              <label
                class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
              >
                Error correction
              </label>
              <select
                v-model="state.ecLevel"
                class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
              >
                <option value="L">L (7%)</option>
                <option value="M">M (15%)</option>
                <option value="Q">Q (25%)</option>
                <option value="H">H (30%)</option>
              </select>
            </div>

            <div class="flex items-end gap-2">
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" v-model="state.autoGenerate" />
                Auto-generate
              </label>
            </div>
          </div>

          <p class="text-xs text-gray-500">
            Tip: Use <b>H</b> for printing, <b>M</b> for normal web sharing.
          </p>
        </div>
      </div>
    </section>

    <section class="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Preview</h2>
        <p class="text-xs text-gray-500" v-if="state.generated">
          {{ state.size }}px • EC {{ state.ecLevel }} • margin
          {{ state.margin }}
        </p>
      </div>

      <div
        class="rounded-xl bg-gray-50 p-4 flex items-center justify-center min-h-[240px]"
      >
        <div class="bg-white border rounded-xl p-4">
          <!-- keep canvas always in DOM -->
          <canvas ref="canvasRef"></canvas>

          <p
            v-if="!state.generated"
            class="mt-3 text-sm text-gray-400 text-center"
          >
            Generate a QR code to preview here.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onMounted } from "vue";

useSeoMeta({
  title: "QR Generator — ChlatWork",
  description: "Generate QR codes for text/URL and download as PNG.",
  ogTitle: "QR Generator — ChlatWork",
  ogDescription: "Generate QR codes instantly and download as PNG.",
});

type ECLevel = "L" | "M" | "Q" | "H";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const isMounted = ref(false);

// SSR-safe dynamic import
type QRCodeLib = typeof import("qrcode");
const QR = ref<QRCodeLib | null>(null);

const state = reactive({
  text: "",
  size: 320,
  margin: 2,
  ecLevel: "M" as ECLevel,
  autoGenerate: true,
  generated: false,
  error: "",
});

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
    if (!state.autoGenerate) return;
    if (!state.text.trim()) {
      clearCanvasOnly();
      state.generated = false;
      state.error = "";
      return;
    }
    if (!import.meta.client || !isMounted.value || !QR.value) return;
    generate();
  },
);

function clearCanvasOnly() {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
}

function clearAll() {
  state.text = "";
  state.error = "";
  state.generated = false;
  clearCanvasOnly();
}

function validateText(v: string): string | null {
  if (!v.trim()) return "Please enter text or URL.";
  if (v.trim().length > 2000) return "Too long (max ~2000 chars).";
  return null;
}

async function generate() {
  state.error = "";
  state.generated = false;

  if (!import.meta.client) return;

  const text = state.text.trim();
  const err = validateText(text);
  if (err) {
    state.error = err;
    return;
  }

  if (!canvasRef.value) {
    state.error = "Preview not ready. Try again.";
    return;
  }

  if (!QR.value) {
    state.error = "QR engine not ready yet. Try again.";
    return;
  }

  try {
    // set canvas size to match output
    canvasRef.value.width = state.size;
    canvasRef.value.height = state.size;

    await QR.value.toCanvas(canvasRef.value, text, {
      width: state.size,
      margin: state.margin,
      errorCorrectionLevel: state.ecLevel,
    });

    state.generated = true;
  } catch (e: any) {
    state.error = e?.message ?? "Failed to generate QR code.";
  }
}

function downloadPng() {
  if (!import.meta.client) return;
  if (!state.generated || !canvasRef.value) return;

  const url = canvasRef.value.toDataURL("image/png");

  const safeName =
    (state.text.trim().slice(0, 18) || "qr")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/-+/g, "-")
      .toLowerCase() + ".png";

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
</script>
