<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Image Compressor</h1>
      <p class="text-sm text-gray-500">
        Compress images in your browser — no upload, no API. Download instantly.
      </p>
    </div>

    <section class="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <h2 class="text-sm font-semibold">Upload</h2>

      <!-- Hidden input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        @change="onPick"
        class="sr-only"
      />

      <!-- Pretty upload box -->
      <label
        class="group block cursor-pointer rounded-2xl border-2 border-dashed p-5 transition hover:border-gray-400 hover:bg-gray-50"
        @click.prevent="openPicker"
      >
        <div class="flex items-center gap-4">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-sm group-hover:shadow"
          >
            <!-- simple upload icon -->
            <svg
              viewBox="0 0 24 24"
              fill="none"
              class="h-6 w-6 text-gray-700"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 16V4" />
              <path d="M7 9l5-5 5 5" />
              <path d="M20 20H4" />
            </svg>
          </div>

          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900">
              {{ file ? "File selected" : "Click to upload" }}
            </p>
            <p class="text-xs text-gray-500">
              {{
                file
                  ? `${file.name} • ${formatBytes(file.size)}`
                  : "PNG, JPG, WebP — up to you 😄"
              }}
            </p>
          </div>

          <span
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white group-hover:bg-gray-800"
          >
            {{ file ? "Change" : "Choose file" }}
          </span>
        </div>
      </label>

      <!-- Optional actions -->
      <div v-if="file" class="flex items-center gap-2">
        <button
          type="button"
          @click="openPicker"
          class="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          Change
        </button>

        <button
          type="button"
          @click="resetAll"
          class="rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Remove
        </button>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </section>

    <section
      v-if="srcUrl"
      class="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
    >
      <div class="flex flex-wrap items-end gap-3 justify-between">
        <div class="space-y-1">
          <h2 class="text-sm font-semibold">Options</h2>
          <p class="text-xs text-gray-500">
            Best: WebP for smallest size, JPEG for compatibility.
          </p>
        </div>

        <div class="flex gap-2">
          <button
            @click="compress()"
            :disabled="loading"
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {{ loading ? "Compressing..." : "Compress" }}
          </button>

          <button
            @click="resetAll"
            :disabled="loading"
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Output format
          </label>
          <select
            v-model="opts.format"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          >
            <option value="image/webp">WebP (smallest)</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG (lossless)</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Quality
            <span
              v-if="opts.format === 'image/png'"
              class="normal-case text-gray-400"
            >
              (ignored for PNG)
            </span>
          </label>
          <input
            v-model.number="opts.quality"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            class="mt-2 w-full"
            :disabled="opts.format === 'image/png'"
          />
          <p class="text-xs text-gray-500 mt-1">
            {{ Math.round(opts.quality * 100) }}%
          </p>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Max width (px)
            <span class="normal-case text-gray-400">(0 = keep)</span>
          </label>
          <input
            v-model.number="opts.maxWidth"
            type="number"
            min="0"
            class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="e.g. 1280"
          />
        </div>
      </div>
    </section>

    <section
      v-if="srcUrl"
      class="rounded-2xl border bg-white p-4 shadow-sm space-y-4"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Preview</h2>

        <button
          v-if="outUrl"
          @click="download()"
          class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Download
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Original
          </p>
          <div class="rounded-xl border bg-gray-50 p-3">
            <img
              :src="srcUrl"
              class="max-h-[320px] mx-auto rounded-lg border bg-white"
            />
          </div>
          <p class="text-xs text-gray-500">
            {{ fileName }} • {{ formatBytes(originalBytes) }}
          </p>
        </div>

        <div class="space-y-2">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Compressed
          </p>
          <div
            class="rounded-xl border bg-gray-50 p-3 min-h-[200px] flex items-center justify-center"
          >
            <div v-if="outUrl" class="w-full">
              <img
                :src="outUrl"
                class="max-h-[320px] mx-auto rounded-lg border bg-white"
              />
            </div>
            <p v-else class="text-sm text-gray-400">
              Click “Compress” to generate output.
            </p>
          </div>

          <p v-if="outBytes" class="text-xs text-gray-500">
            {{ outName }} • {{ formatBytes(outBytes) }}
            <span
              class="ml-2 font-semibold"
              :class="savedPct >= 0 ? 'text-green-700' : 'text-red-600'"
            >
              ({{ savedPct >= 0 ? "-" : "+"
              }}{{ Math.abs(savedPct).toFixed(1) }}%)
            </span>
          </p>
        </div>
      </div>

      <p class="text-xs text-gray-500">
        Note: PNG is lossless and may become bigger. For best compression use
        WebP or JPEG.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onBeforeUnmount } from "vue";

const error = ref("");
const loading = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

const file = ref<File | null>(null);
const srcUrl = ref<string>("");

const outUrl = ref<string>("");
const outBytes = ref<number>(0);

const opts = reactive({
  format: "image/webp" as "image/webp" | "image/jpeg" | "image/png",
  quality: 0.8,
  maxWidth: 1280, // 0 = keep
});

const fileName = computed(() => file.value?.name ?? "image");
const originalBytes = computed(() => file.value?.size ?? 0);

const outExt = computed(() => {
  if (opts.format === "image/webp") return "webp";
  if (opts.format === "image/jpeg") return "jpg";
  return "png";
});

const outName = computed(() => {
  const base = (fileName.value || "image").replace(/\.[^.]+$/, "");
  return `${base}-compressed.${outExt.value}`;
});

const savedPct = computed(() => {
  if (!originalBytes.value || !outBytes.value) return 0;
  return ((originalBytes.value - outBytes.value) / originalBytes.value) * 100;
});

function openPicker() {
  fileInput.value?.click();
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0] ?? null;

  error.value = "";
  clearOutput();

  if (srcUrl.value) URL.revokeObjectURL(srcUrl.value);

  file.value = f;
  srcUrl.value = f ? URL.createObjectURL(f) : "";
}

function clearOutput() {
  outBytes.value = 0;
  if (outUrl.value) URL.revokeObjectURL(outUrl.value);
  outUrl.value = "";
}

function resetAll() {
  error.value = "";
  loading.value = false;
  file.value = null;

  // ✅ also clear native input so picking same file again triggers change
  if (fileInput.value) fileInput.value.value = "";

  clearOutput();
  if (srcUrl.value) URL.revokeObjectURL(srcUrl.value);
  srcUrl.value = "";
}

async function compress() {
  if (!file.value) return;

  error.value = "";
  loading.value = true;
  clearOutput();

  try {
    const img = await loadImage(srcUrl.value);
    const { canvas, ctx } = createCanvasForImage(img, opts.maxWidth);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(
      canvas,
      opts.format,
      opts.format === "image/png" ? 1 : opts.quality,
    );

    outBytes.value = blob.size;
    outUrl.value = URL.createObjectURL(blob);
  } catch (e: any) {
    error.value = e?.message ?? "Failed to compress image.";
  } finally {
    loading.value = false;
  }
}

function download() {
  if (!outUrl.value) return;
  const a = document.createElement("a");
  a.href = outUrl.value;
  a.download = outName.value;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

function createCanvasForImage(img: HTMLImageElement, maxWidth: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  let outW = w;
  let outH = h;

  if (maxWidth > 0 && w > maxWidth) {
    const ratio = maxWidth / w;
    outW = Math.round(w * ratio);
    outH = Math.round(h * ratio);
  }

  canvas.width = outW;
  canvas.height = outH;

  return { canvas, ctx };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to export image."))),
      type,
      quality,
    );
  });
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = bytes / Math.pow(k, i);
  return `${v.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

onBeforeUnmount(() => {
  if (srcUrl.value) URL.revokeObjectURL(srcUrl.value);
  if (outUrl.value) URL.revokeObjectURL(outUrl.value);
});
</script>
