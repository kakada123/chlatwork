<script setup lang="ts">
import {
  BROWSER_IMAGE_EXTENSIONS,
  BROWSER_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE,
  validateFiles,
} from "~/lib/file-validation";
import {
  scanImageFileForCodes,
  scanVideoFrameForCodes,
  type ImageCodeScanMode,
  type ImageCodeScanResult,
} from "~/lib/image-code-scanner";

const props = defineProps<{
  mode: ImageCodeScanMode;
}>();

const scannerCopy = computed(() => {
  if (props.mode === "qr") {
    return {
      title: "QR Scanner",
      intro:
        "Upload a screenshot, photo, or saved poster to decode a QR code locally in your browser.",
      hint: "Best for QR screenshots, menu photos, payment posters, and links.",
      dropLabel: "Choose or drop a QR image",
      buttonLabel: "Scan QR",
      emptyTitle: "No QR image loaded yet",
      emptyText:
        "Choose a file to read a QR code from an image. The scan stays local in your browser.",
      resultLabel: "Decoded QR content",
      formatLabel: "QR Code",
    };
  }

  return {
    title: "Barcode Scanner",
    intro:
      "Upload a label photo, screenshot, or saved image to decode a barcode locally in your browser.",
    hint: "Best for CODE128, EAN13, UPC, and CODE39 images.",
    dropLabel: "Choose or drop a barcode image",
    buttonLabel: "Scan barcode",
    emptyTitle: "No barcode image loaded yet",
    emptyText:
      "Choose a file to read a barcode from an image. The scan stays local in your browser.",
    resultLabel: "Decoded barcode value",
    formatLabel: "Barcode",
  };
});

const fileInput = ref<HTMLInputElement | null>(null);
const cameraVideo = ref<HTMLVideoElement | null>(null);
const previewUrl = ref("");
const selectedFileName = ref("");
const selectedFile = ref<File | null>(null);
const loading = ref(false);
const error = ref("");
const results = ref<ImageCodeScanResult[]>([]);
const supportsNativeScanner = ref(false);
const supportsCameraInput = ref(false);
const isSecureCameraContext = ref(false);
const activeMode = ref<"upload" | "camera">("upload");
const isCameraRunning = ref(false);
const cameraDevices = ref<MediaDeviceInfo[]>([]);
const selectedCameraId = ref("");
const cameraStream = ref<MediaStream | null>(null);
let cameraRafId: number | null = null;
let lastScanAt = 0;

onMounted(() => {
  supportsNativeScanner.value = Boolean((window as any).BarcodeDetector);
  isSecureCameraContext.value =
    typeof window !== "undefined" &&
    (window.isSecureContext ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  supportsCameraInput.value =
    typeof navigator !== "undefined" &&
    isSecureCameraContext.value &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  void refreshCameraDevices();
});

onBeforeUnmount(() => {
  stopCamera();
  clearPreviewUrl();
});

watch(activeMode, (mode) => {
  if (mode === "upload") {
    stopCamera();
  }
});

function clearPreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
  }
}

function openPicker() {
  activeMode.value = "upload";
  fileInput.value?.click();
}

async function refreshCameraDevices() {
  if (!supportsCameraInput.value || !navigator.mediaDevices?.enumerateDevices) {
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices.value = devices.filter(
      (device) => device.kind === "videoinput",
    );

    if (!selectedCameraId.value && cameraDevices.value[0]) {
      selectedCameraId.value = cameraDevices.value[0].deviceId;
    }
  } catch {
    // Ignore silently; camera permission state can block labels before first access.
  }
}

async function handleFiles(files: File[]) {
  const validation = validateFiles(files, {
    allowedExtensions: BROWSER_IMAGE_EXTENSIONS,
    allowedMimeTypes: BROWSER_IMAGE_MIME_TYPES,
    currentFileCount: 0,
    label: "image",
    maxFileSize: MAX_IMAGE_FILE_SIZE,
    maxFiles: 1,
  });

  const firstValidationError = validation.errors[0];
  if (firstValidationError) {
    error.value = firstValidationError;
  }

  const file = validation.acceptedFiles[0];
  if (!file) {
    return;
  }

  clearPreviewUrl();
  selectedFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
  selectedFileName.value = file.name;
  await scanFile(file);
}

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  await handleFiles(files);
}

async function onDrop(event: DragEvent) {
  await handleFiles(Array.from(event.dataTransfer?.files ?? []));
}

async function scanFile(file: File) {
  loading.value = true;
  error.value = "";
  results.value = [];

  try {
    const scanned = await scanImageFileForCodes(file, props.mode);
    results.value = scanned;

    if (scanned.length === 0) {
      error.value =
        props.mode === "qr"
          ? "No QR code was found in the selected image."
          : "No barcode was found in the selected image.";
    }
  } catch (scanError: any) {
    error.value =
      scanError?.message ??
      (props.mode === "qr"
        ? "Failed to scan the QR image."
        : "Failed to scan the barcode image.");
  } finally {
    loading.value = false;
  }
}

function stopCamera() {
  if (cameraRafId !== null) {
    cancelAnimationFrame(cameraRafId);
    cameraRafId = null;
  }

  isCameraRunning.value = false;
  loading.value = false;

  if (cameraStream.value) {
    for (const track of cameraStream.value.getTracks()) {
      track.stop();
    }
    cameraStream.value = null;
  }

  if (cameraVideo.value) {
    cameraVideo.value.srcObject = null;
  }
}

async function startCamera() {
  if (!isSecureCameraContext.value) {
    error.value = "Camera requires HTTPS (or localhost in development).";
    return;
  }

  if (!supportsCameraInput.value) {
    error.value = "Camera access is not available in this browser.";
    return;
  }

  stopCamera();
  error.value = "";
  activeMode.value = "camera";

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: selectedCameraId.value
      ? { deviceId: { exact: selectedCameraId.value } }
      : { facingMode: { ideal: "environment" } },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    cameraStream.value = stream;
    isCameraRunning.value = true;

    if (cameraVideo.value) {
      cameraVideo.value.srcObject = stream;
      await cameraVideo.value.play();
    }

    await refreshCameraDevices();
    beginCameraScanLoop();
  } catch {
    error.value =
      "Unable to access camera. Please allow permission and check your browser settings.";
    stopCamera();
  }
}

function beginCameraScanLoop() {
  if (!isCameraRunning.value || !cameraVideo.value) {
    return;
  }

  const runFrame = async (now: number) => {
    if (!isCameraRunning.value || !cameraVideo.value) {
      return;
    }

    if (now - lastScanAt > 350) {
      lastScanAt = now;
      loading.value = true;

      try {
        const scanned = await scanVideoFrameForCodes(
          cameraVideo.value,
          props.mode,
        );
        if (scanned.length > 0) {
          results.value = scanned;
          error.value = "";
        }
      } catch {
        error.value =
          props.mode === "qr"
            ? "Failed to scan camera frame for QR code."
            : "Failed to scan camera frame for barcode.";
      } finally {
        loading.value = false;
      }
    }

    cameraRafId = requestAnimationFrame(runFrame);
  };

  cameraRafId = requestAnimationFrame(runFrame);
}

async function onCameraChange() {
  if (!isCameraRunning.value) {
    return;
  }

  await startCamera();
}

async function rescanCurrentFile() {
  const file = selectedFile.value;
  if (!file) {
    return;
  }

  await scanFile(file);
}

function clearAll() {
  if (fileInput.value) {
    fileInput.value.value = "";
  }

  clearPreviewUrl();
  stopCamera();
  activeMode.value = "upload";
  selectedFile.value = null;
  selectedFileName.value = "";
  loading.value = false;
  error.value = "";
  results.value = [];
}

function humanizeFormat(format: string) {
  return format
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const primaryResult = computed(() => results.value[0] ?? null);
const multipleResults = computed(() => results.value.slice(1));
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <p
        class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300"
      >
        Local scanner
      </p>
      <h1
        class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl"
      >
        {{ scannerCopy.title }}
      </h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
        {{ scannerCopy.intro }}
      </p>
    </div>

    <section
      class="space-y-4 rounded-[22px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
            Scan source
          </h2>
          <p class="text-xs text-slate-500 dark:text-white/55">
            Use image upload or live camera scanning.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              activeMode === 'upload'
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]'
            "
            @click="activeMode = 'upload'"
          >
            Upload image
          </button>

          <button
            type="button"
            class="rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              activeMode === 'camera'
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]'
            "
            :disabled="!supportsCameraInput"
            @click="activeMode = 'camera'"
          >
            Camera
          </button>

          <button
            type="button"
            class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
            :disabled="
              activeMode === 'upload'
                ? !previewUrl || loading
                : !isCameraRunning
            "
            @click="
              activeMode === 'upload' ? rescanCurrentFile() : stopCamera()
            "
          >
            {{
              activeMode === "upload"
                ? loading
                  ? "Scanning..."
                  : scannerCopy.buttonLabel
                : "Stop camera"
            }}
          </button>

          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="loading"
            @click="activeMode === 'upload' ? openPicker() : startCamera()"
          >
            {{ activeMode === "upload" ? "Replace image" : "Start camera" }}
          </button>

          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="!previewUrl && !results.length && !error"
            @click="clearAll"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        v-if="activeMode === 'camera'"
        class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04] md:grid-cols-[1fr_auto]"
      >
        <label class="space-y-1 text-xs text-slate-500 dark:text-white/50">
          Camera device
          <select
            v-model="selectedCameraId"
            class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            @change="onCameraChange"
          >
            <option
              v-for="(device, index) in cameraDevices"
              :key="device.deviceId || `camera-${index}`"
              :value="device.deviceId"
            >
              {{ device.label || `Camera ${index + 1}` }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="self-end rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
          @click="refreshCameraDevices"
        >
          Refresh cameras
        </button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        capture="environment"
        class="sr-only"
        @change="onPick"
      />

      <label
        class="group block cursor-pointer rounded-[20px] border-2 border-dashed border-slate-200 bg-slate-50 p-5 transition hover:border-sky-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-cyan-300/50 dark:hover:bg-white/[0.07]"
        @click.prevent="openPicker"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition group-hover:scale-105 dark:bg-white/[0.08] dark:ring-white/10"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              class="h-6 w-6 text-slate-700 dark:text-white/80"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M12 16V4" />
              <path d="M7 9l5-5 5 5" />
              <path d="M20 20H4" />
            </svg>
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ previewUrl ? selectedFileName : scannerCopy.dropLabel }}
            </p>
            <p class="text-xs text-slate-500 dark:text-white/50">
              Drag and drop an image here or click to choose a file.
            </p>
          </div>

          <span
            class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition group-hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:group-hover:bg-slate-100"
          >
            Choose image
          </span>
        </div>
      </label>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-300">
        {{ error }}
      </p>

      <p
        v-if="!supportsNativeScanner"
        class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-300/20 dark:bg-blue-300/10 dark:text-blue-100"
      >
        Running in compatibility mode for this browser. Scanning still works,
        but detection may be slower than Chromium.
      </p>

      <p
        v-if="activeMode === 'camera' && !supportsCameraInput"
        class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
      >
        <span v-if="!isSecureCameraContext">
          Camera needs HTTPS (or localhost in development).
        </span>
        <span v-else>
          Camera access is not available in this browser context.
        </span>
      </p>

      <div
        v-if="previewUrl || activeMode === 'camera'"
        class="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]"
      >
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
            Preview
          </h3>
          <div
            class="flex min-h-[280px] items-center justify-center rounded-[20px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]"
          >
            <img
              v-if="activeMode === 'upload' && previewUrl"
              :src="previewUrl"
              :alt="`Uploaded ${scannerCopy.formatLabel.toLowerCase()} image`"
              class="max-h-[420px] w-full rounded-xl object-contain"
              loading="lazy"
              decoding="async"
            />

            <video
              v-else
              ref="cameraVideo"
              class="max-h-[420px] w-full rounded-xl bg-black object-contain"
              autoplay
              muted
              playsinline
            />
          </div>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
            Result
          </h3>

          <div
            class="rounded-[20px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.05]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p
                  class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/45"
                >
                  {{ scannerCopy.resultLabel }}
                </p>
                <p
                  class="mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white"
                >
                  {{ primaryResult?.rawValue || scannerCopy.emptyTitle }}
                </p>
              </div>

              <DeveloperToolsCopyButton
                :text="primaryResult?.rawValue ?? ''"
                label="Copy"
                variant="secondary"
              />
            </div>

            <div v-if="primaryResult" class="mt-4 space-y-2">
              <p class="text-xs text-slate-500 dark:text-white/50">
                Format: {{ humanizeFormat(primaryResult.format) }}
              </p>

              <p class="text-xs text-slate-500 dark:text-white/50">
                {{ results.length }} decoded item{{
                  results.length === 1 ? "" : "s"
                }}
              </p>
            </div>

            <p v-else class="mt-4 text-sm text-slate-500 dark:text-white/50">
              {{ scannerCopy.emptyText }}
            </p>
          </div>

          <div
            class="rounded-[20px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-white/45"
            >
              File info
            </p>
            <p
              class="mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white"
            >
              {{
                activeMode === "upload"
                  ? selectedFileName || "No file selected"
                  : isCameraRunning
                    ? "Camera is active"
                    : "Camera is not active"
              }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
              {{
                activeMode === "upload"
                  ? "The image stays local in your browser while it is scanned."
                  : "Camera frames are processed locally in your browser."
              }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="multipleResults.length > 0"
      class="space-y-4 rounded-[22px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
          Additional decoded items
        </h2>
        <p class="text-xs text-slate-500 dark:text-white/50">
          {{ multipleResults.length }} more
        </p>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="(item, index) in multipleResults"
          :key="`${item.format}-${item.rawValue}-${index}`"
          class="space-y-3 rounded-[18px] border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p
                class="line-clamp-2 break-words text-sm font-semibold text-slate-950 dark:text-white"
              >
                {{ item.rawValue }}
              </p>
              <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
                {{ humanizeFormat(item.format) }}
              </p>
            </div>

            <DeveloperToolsCopyButton
              :text="item.rawValue"
              label="Copy"
              variant="secondary"
            />
          </div>
        </article>
      </div>
    </section>

    <section
      class="rounded-[22px] border border-white/80 bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white shadow-lg shadow-slate-950/20 dark:border-white/10"
    >
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h2
            class="text-sm font-semibold uppercase tracking-wide text-white/70"
          >
            How it works
          </h2>
          <p class="mt-2 text-sm leading-6 text-white/80">
            Choose a clear image, let the browser decode it locally, and copy
            the result once the code is found.
          </p>
        </div>

        <ul class="space-y-2 text-sm leading-6 text-white/75">
          <li>• {{ scannerCopy.hint }}</li>
          <li>• The scan stays on your device.</li>
          <li>• Replace the image whenever you need a different file.</li>
        </ul>
      </div>
    </section>
  </div>
</template>
