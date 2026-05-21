<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-xl font-bold">Image Compressor</h1>
      <p class="text-sm text-gray-500 dark:text-white/55">
        Compress one image or a batch in your browser. No upload, no API.
      </p>
    </div>

    <section
      class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-sm font-semibold">Upload</h2>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        @change="onPick"
      />

      <label
        class="group block cursor-pointer rounded-2xl border-2 border-dashed p-5 transition hover:border-gray-400 hover:bg-gray-50 dark:border-white/15 dark:hover:border-white/30 dark:hover:bg-white/[0.06]"
        @click.prevent="openPicker('replace')"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm group-hover:shadow dark:border-white/10 dark:bg-white/[0.08]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              class="h-6 w-6 text-gray-700 dark:text-white/75"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="M7 9l5-5 5 5" />
              <path d="M20 20H4" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ hasFiles ? selectedSummary : "Click or drop images here" }}
            </p>
            <p class="text-xs text-gray-500 dark:text-white/50">
              {{
                hasFiles
                  ? "Batch compress selected images with the same settings."
                  : "PNG, JPG, WebP, and other browser-readable images."
              }}
            </p>
          </div>

          <span
            class="inline-flex h-10 items-center justify-center rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white transition group-hover:bg-gray-800 group-hover:text-white dark:bg-gray-950 dark:text-white dark:ring-1 dark:ring-white/15 dark:group-hover:bg-gray-800 dark:group-hover:text-white"
          >
            {{ hasFiles ? "Replace" : "Choose images" }}
          </span>
        </div>
      </label>

      <div v-if="hasFiles" class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.12]"
          :disabled="loading || isBatchFull"
          @click="openPicker('append')"
        >
          Add more
        </button>

        <button
          type="button"
          class="rounded-xl px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
          :disabled="loading"
          @click="resetAll"
        >
          Remove all
        </button>

        <p class="text-xs text-gray-500 dark:text-white/50">
          Up to {{ maxBatchSize }} images per batch.
        </p>
      </div>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-300">
        {{ error }}
      </p>
    </section>

    <section
      v-if="hasFiles"
      class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-sm font-semibold">Options</h2>
          <p class="text-xs text-gray-500 dark:text-white/50">
            One setting set is applied to every selected image.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 hover:text-white disabled:opacity-50 dark:bg-gray-950 dark:text-white dark:ring-1 dark:ring-white/15 dark:hover:bg-gray-800 dark:hover:text-white"
            :disabled="loading || !hasFiles"
            @click="compressAll"
          >
            {{ compressButtonLabel }}
          </button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="loading"
            @click="clearAllOutputs"
          >
            Clear output
          </button>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45"
          >
            Output format
          </label>
          <select
            v-model="opts.format"
            class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white"
          >
            <option value="image/webp">WebP (smallest)</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG (lossless)</option>
          </select>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45"
          >
            Quality
            <span
              v-if="
                opts.format === 'image/png' ||
                (opts.format === 'image/webp' && opts.webpLossless)
              "
              class="normal-case text-gray-400"
            >
              (ignored)
            </span>
          </label>

          <input
            v-model.number="opts.quality"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            class="mt-2 w-full"
            :disabled="
              opts.format === 'image/png' ||
              (opts.format === 'image/webp' && opts.webpLossless)
            "
          />

          <p class="mt-1 text-xs text-gray-500 dark:text-white/50">
            {{ Math.round(opts.quality * 100) }}%
          </p>

          <label
            v-if="opts.format === 'image/webp'"
            class="mt-2 inline-flex select-none items-center gap-2 text-xs text-gray-600 dark:text-white/60"
          >
            <input
              v-model="opts.webpLossless"
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300"
            />
            WebP high detail for screenshots or UI text
          </label>
        </div>

        <div>
          <label
            class="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45"
          >
            Max width (px)
            <span class="normal-case text-gray-400">(0 = keep)</span>
          </label>
          <input
            v-model.number="opts.maxWidth"
            type="number"
            min="0"
            class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white"
            placeholder="e.g. 1280"
          />
        </div>
      </div>
    </section>

    <section
      v-if="activeItem"
      class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-sm font-semibold">Preview & results</h2>
          <p class="text-xs text-gray-500 dark:text-white/50">
            {{ resultSummary }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-if="activeItem.status === 'done'"
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 hover:text-white dark:bg-gray-950 dark:text-white dark:ring-1 dark:ring-white/15 dark:hover:bg-gray-800 dark:hover:text-white"
            @click="downloadItem(activeItem)"
          >
            Download selected
          </button>

          <button
            v-if="completedItems.length > 1"
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-white/[0.08] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="zipLoading"
            @click="downloadAll"
          >
            {{ zipLoading ? "Creating ZIP..." : "Download ZIP" }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45"
          >
            Original
          </p>
          <div
            class="rounded-xl border bg-gray-50 p-3 dark:border-white/10 dark:bg-black/20"
          >
            <img
              :src="activeItem.srcUrl"
              :alt="`Original preview for ${activeItem.file.name}`"
              class="mx-auto max-h-[320px] rounded-lg border bg-white dark:border-white/10"
            />
          </div>
          <p class="truncate text-xs text-gray-500 dark:text-white/50">
            {{ activeItem.file.name }} - {{ formatBytes(activeItem.file.size) }}
          </p>
        </div>

        <div class="space-y-2">
          <p
            class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45"
          >
            Compressed
          </p>
          <div
            class="flex min-h-[200px] items-center justify-center rounded-xl border bg-gray-50 p-3 dark:border-white/10 dark:bg-black/20"
          >
            <div v-if="activeItem.status === 'done' && activeItem.outUrl" class="w-full">
              <img
                :src="activeItem.outUrl"
                :alt="`Compressed preview for ${activeItem.file.name}`"
                class="mx-auto max-h-[320px] rounded-lg border bg-white dark:border-white/10"
              />
            </div>
            <p
              v-else-if="activeItem.status === 'compressing'"
              class="text-sm text-gray-500 dark:text-white/50"
            >
              Compressing this image...
            </p>
            <p
              v-else-if="activeItem.message"
              class="text-sm text-gray-500 dark:text-white/50"
            >
              {{ activeItem.message }}
            </p>
            <p v-else class="text-sm text-gray-400">
              Click Compress to generate output.
            </p>
          </div>

          <p
            v-if="activeItem.status === 'done'"
            class="text-xs text-gray-500 dark:text-white/50"
          >
            {{ outputName(activeItem) }} - {{ formatBytes(activeItem.outBytes) }}
            <span class="ml-2 font-semibold text-green-700 dark:text-green-300">
              -{{ savedPct(activeItem).toFixed(1) }}%
            </span>
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
          Batch queue
        </h3>

        <div class="grid gap-2">
          <div
            v-for="item in items"
            :key="item.id"
            class="flex flex-col gap-2 rounded-xl border p-3 transition sm:flex-row sm:items-center dark:border-white/10"
            :class="
              activeItem.id === item.id
                ? 'border-gray-900 bg-gray-50 dark:border-white/45 dark:bg-white/[0.08]'
                : 'bg-white hover:bg-gray-50 dark:bg-transparent dark:hover:bg-white/[0.05]'
            "
          >
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="activeId = item.id"
            >
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                {{ item.file.name }}
              </span>
              <span class="block text-xs text-gray-500 dark:text-white/50">
                {{ formatBytes(item.file.size) }}
                <template v-if="item.status === 'done'">
                  -> {{ formatBytes(item.outBytes) }}
                </template>
              </span>
            </button>

            <div class="flex shrink-0 flex-wrap items-center gap-2">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="statusBadgeClass(item.status)"
              >
                {{ statusLabel(item) }}
              </span>

              <button
                v-if="item.status === 'done'"
                type="button"
                class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-800 hover:text-white dark:bg-gray-950 dark:text-white dark:ring-1 dark:ring-white/15 dark:hover:bg-gray-800 dark:hover:text-white"
                @click="downloadItem(item)"
              >
                Download
              </button>

              <button
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-400/10"
                :disabled="loading"
                @click="removeItem(item.id)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <p class="text-xs text-gray-500 dark:text-white/50">
        PNG is lossless and may become bigger. For photos, use WebP or JPEG with
        lower quality. For screenshots and text-heavy images, try WebP high
        detail or reduce max width.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from "vue";
import { createStoredZip, type ZipEntryInput } from "~/lib/browser-zip";

type OutputFormat = "image/webp" | "image/jpeg" | "image/png";
type PickerMode = "replace" | "append";
type ImageStatus = "idle" | "compressing" | "done" | "skipped" | "error";

type ImageItem = {
  id: string;
  file: File;
  srcUrl: string;
  outUrl: string;
  outBlob: Blob | null;
  outBytes: number;
  status: ImageStatus;
  message: string;
};

const maxBatchSize = 40;

const error = ref("");
const loading = ref(false);
const zipLoading = ref(false);
const activeId = ref("");
const compressingIndex = ref(0);
const pickerMode = ref<PickerMode>("replace");
const fileInput = ref<HTMLInputElement | null>(null);
const items = ref<ImageItem[]>([]);

const opts = reactive({
  format: "image/webp" as OutputFormat,
  quality: 0.8,
  maxWidth: 1280,
  webpLossless: false,
});

const hasFiles = computed(() => items.value.length > 0);
const isBatchFull = computed(() => items.value.length >= maxBatchSize);
const activeItem = computed(
  () => items.value.find((item) => item.id === activeId.value) ?? items.value[0] ?? null,
);
const completedItems = computed(() =>
  items.value.filter((item) => item.status === "done" && item.outBlob),
);
const failedItems = computed(() =>
  items.value.filter((item) => item.status === "skipped" || item.status === "error"),
);
const totalOriginalBytes = computed(() =>
  items.value.reduce((total, item) => total + item.file.size, 0),
);
const totalSavedBytes = computed(() =>
  completedItems.value.reduce(
    (total, item) => total + Math.max(0, item.file.size - item.outBytes),
    0,
  ),
);
const selectedSummary = computed(
  () =>
    `${items.value.length} ${items.value.length === 1 ? "image" : "images"} - ${formatBytes(
      totalOriginalBytes.value,
    )} total`,
);
const compressButtonLabel = computed(() => {
  if (loading.value) {
    return `Compressing ${compressingIndex.value}/${items.value.length}`;
  }

  return items.value.length === 1 ? "Compress image" : `Compress ${items.value.length} images`;
});
const resultSummary = computed(() => {
  if (!completedItems.value.length && !failedItems.value.length) {
    return "Compressed results will appear here after processing.";
  }

  const done = `${completedItems.value.length} compressed`;
  const skipped = failedItems.value.length ? `, ${failedItems.value.length} skipped` : "";
  const saved = totalSavedBytes.value ? ` - saved ${formatBytes(totalSavedBytes.value)}` : "";

  return `${done}${skipped}${saved}`;
});

function openPicker(mode: PickerMode = "replace") {
  pickerMode.value = mode;
  fileInput.value?.click();
}

function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  applyPickedFiles(Array.from(input.files ?? []), pickerMode.value);
  input.value = "";
}

function onDrop(event: DragEvent) {
  applyPickedFiles(Array.from(event.dataTransfer?.files ?? []), "replace");
}

function applyPickedFiles(files: File[], mode: PickerMode) {
  error.value = "";

  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) {
    error.value = "Please choose browser-readable image files.";
    return;
  }

  if (mode === "replace") {
    clearItems();
  }

  const availableSlots = Math.max(0, maxBatchSize - items.value.length);
  const existingKeys = new Set(items.value.map((item) => fileKey(item.file)));
  const acceptedFiles = imageFiles
    .filter((file) => mode === "replace" || !existingKeys.has(fileKey(file)))
    .slice(0, availableSlots);

  if (!acceptedFiles.length) {
    error.value = isBatchFull.value
      ? `Batch limit reached. Remove images before adding more.`
      : "Those images are already in the batch.";
    return;
  }

  const nextItems = acceptedFiles.map(createImageItem);
  items.value = [...items.value, ...nextItems];
  activeId.value = activeId.value || nextItems[0]?.id || "";

  if (imageFiles.length > acceptedFiles.length) {
    error.value = `Added ${acceptedFiles.length} image${
      acceptedFiles.length === 1 ? "" : "s"
    }. Batch size is limited to ${maxBatchSize} images.`;
  }

  // PNG screenshots often keep text clearer with high-detail WebP output.
  if (opts.format === "image/webp" && nextItems.some((item) => inputExt(item.file.name) === "png")) {
    opts.webpLossless = true;
  }
}

function createImageItem(file: File): ImageItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    srcUrl: URL.createObjectURL(file),
    outUrl: "",
    outBlob: null,
    outBytes: 0,
    status: "idle",
    message: "",
  };
}

function removeItem(id: string) {
  const item = items.value.find((entry) => entry.id === id);
  if (!item) return;

  revokeItemUrls(item);
  items.value = items.value.filter((entry) => entry.id !== id);

  if (activeId.value === id) {
    activeId.value = items.value[0]?.id ?? "";
  }

  if (!items.value.length) {
    error.value = "";
  }
}

function clearItems() {
  items.value.forEach(revokeItemUrls);
  items.value = [];
  activeId.value = "";
}

function resetAll() {
  error.value = "";
  loading.value = false;
  compressingIndex.value = 0;
  clearItems();

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function clearItemOutput(item: ImageItem) {
  if (item.outUrl) URL.revokeObjectURL(item.outUrl);
  item.outUrl = "";
  item.outBlob = null;
  item.outBytes = 0;
  item.message = "";
  item.status = "idle";
}

function clearAllOutputs() {
  error.value = "";
  items.value.forEach(clearItemOutput);
}

async function compressAll() {
  if (!items.value.length) return;

  error.value = "";
  loading.value = true;
  compressingIndex.value = 0;
  items.value.forEach(clearItemOutput);

  try {
    // Sequential processing avoids creating many large canvases and blobs at once.
    for (const [index, item] of items.value.entries()) {
      compressingIndex.value = index + 1;
      activeId.value = item.id;
      await compressItem(item);
    }

    if (!completedItems.value.length) {
      error.value = "No images were compressed. Try lower quality or reduce max width.";
    } else if (failedItems.value.length) {
      error.value = `${failedItems.value.length} image${
        failedItems.value.length === 1 ? "" : "s"
      } skipped because the output was bigger or failed to export.`;
    }
  } finally {
    loading.value = false;
    compressingIndex.value = 0;
  }
}

async function compressItem(item: ImageItem) {
  item.status = "compressing";
  item.message = "";

  try {
    const img = await loadImage(item.srcUrl);
    const { canvas, ctx } = createCanvasForImage(img, opts.maxWidth);

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const baseQuality =
      opts.format === "image/png"
        ? 1
        : opts.format === "image/webp" && opts.webpLossless
          ? 1
          : opts.quality;

    let blob = await canvasToBlob(canvas, opts.format, baseQuality);

    if (blob.size >= item.file.size && opts.format !== "image/png") {
      const canLower =
        !(opts.format === "image/webp" && opts.webpLossless) &&
        (opts.format === "image/webp" || opts.format === "image/jpeg");

      if (canLower) {
        const retryQuality = Math.max(0.5, baseQuality - 0.2);
        const retry = await canvasToBlob(canvas, opts.format, retryQuality);
        if (retry.size < blob.size) blob = retry;
      }
    }

    if (blob.size >= item.file.size) {
      const biggerPct = ((blob.size - item.file.size) / item.file.size) * 100;
      item.status = "skipped";
      item.message = `Skipped because output would be ${biggerPct.toFixed(
        1,
      )}% bigger. Try lower quality or reduce max width.`;
      return;
    }

    item.outBlob = blob;
    item.outBytes = blob.size;
    item.outUrl = URL.createObjectURL(blob);
    item.status = "done";
    item.message = `Saved ${formatBytes(item.file.size - blob.size)}.`;
  } catch (e: unknown) {
    item.status = "error";
    item.message = e instanceof Error ? e.message : "Failed to compress image.";
  }
}

function downloadItem(item: ImageItem) {
  if (!item.outUrl) return;
  triggerDownload(item.outUrl, outputName(item));
}

async function downloadAll() {
  if (!completedItems.value.length || zipLoading.value) return;

  zipLoading.value = true;
  error.value = "";

  try {
    const usedNames = new Set<string>();
    const zip = await createStoredZip(
      completedItems.value
        .filter((item): item is ImageItem & { outBlob: Blob } => Boolean(item.outBlob))
        .map<ZipEntryInput>((item) => ({
          name: uniqueOutputName(item, usedNames),
          blob: item.outBlob,
          modifiedAt: new Date(item.file.lastModified),
        })),
    );

    triggerDownload(URL.createObjectURL(zip), "chlatwork-compressed-images.zip", true);
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "Failed to create ZIP file.";
  } finally {
    zipLoading.value = false;
  }
}

function triggerDownload(url: string, fileName: string, revokeAfterClick = false) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (revokeAfterClick) {
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

function outputName(item: ImageItem) {
  const base = item.file.name.replace(/\.[^.]+$/, "") || "image";
  return `${base}-compressed.${outputExt()}`;
}

function uniqueOutputName(item: ImageItem, usedNames: Set<string>) {
  const base = item.file.name.replace(/\.[^.]+$/, "") || "image";
  const ext = outputExt();
  let name = `${base}-compressed.${ext}`;
  let copyIndex = 2;

  while (usedNames.has(name)) {
    name = `${base}-compressed-${copyIndex}.${ext}`;
    copyIndex += 1;
  }

  usedNames.add(name);
  return name;
}

function outputExt() {
  if (opts.format === "image/webp") return "webp";
  if (opts.format === "image/jpeg") return "jpg";
  return "png";
}

function savedPct(item: ImageItem) {
  if (!item.file.size || !item.outBytes) return 0;
  return ((item.file.size - item.outBytes) / item.file.size) * 100;
}

function statusLabel(item: ImageItem) {
  if (item.status === "done") return `Saved ${savedPct(item).toFixed(1)}%`;
  if (item.status === "compressing") return "Compressing";
  if (item.status === "skipped") return "Skipped";
  if (item.status === "error") return "Error";
  return "Ready";
}

function statusBadgeClass(status: ImageStatus) {
  if (status === "done") return "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-300";
  if (status === "compressing") return "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300";
  if (status === "skipped") return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  if (status === "error") return "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300";
  return "bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-white/65";
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

  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  let outputWidth = width;
  let outputHeight = height;

  if (maxWidth > 0 && width > maxWidth) {
    const ratio = maxWidth / width;
    outputWidth = Math.round(width * ratio);
    outputHeight = Math.round(height * ratio);
  }

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  return { canvas, ctx };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: OutputFormat,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export image."))),
      type,
      quality,
    );
  });
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const size = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(size)), units.length - 1);
  const value = bytes / Math.pow(size, index);

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function inputExt(fileName: string) {
  return fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
}

function revokeItemUrls(item: ImageItem) {
  URL.revokeObjectURL(item.srcUrl);
  if (item.outUrl) URL.revokeObjectURL(item.outUrl);
}

onBeforeUnmount(() => {
  clearItems();
});
</script>
