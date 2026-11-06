<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
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
  type ImageCodeScanRegion,
  type ImageCodeScanResult,
} from "~/lib/image-code-scanner";

const { t } = useAppI18n();

const props = defineProps<{
  mode: ImageCodeScanMode;
}>();

const { isKhmer } = useLanguage();

const scannerCopy = computed(() => {
  if (props.mode === "qr") {
    return {
      title: t("tools.scanner.qrScanner"),
      intro: t("tools.scanner.uploadAScreenshotPhotoOrSavedPosterToDecode"),
      hint: t("tools.scanner.bestForQrScreenshotsMenuPhotosPaymentPostersAnd"),
      dropLabel: t("tools.scanner.chooseOrDropAQrImage"),
      buttonLabel: t("tools.scanner.scanQr"),
      emptyTitle: t("tools.scanner.noQrImageLoadedYet"),
      emptyText: t("tools.scanner.chooseAFileToReadAQrCodeFrom"),
      resultLabel: t("tools.scanner.decodedQrContent"),
      formatLabel: "QR Code",
    };
  }

  return {
    title: t("tools.scanner.barcodeScanner"),
    intro: t("tools.scanner.uploadALabelPhotoScreenshotOrSavedImageTo"),
    hint: t("tools.scanner.bestForCode128Ean13UpcAndCode39Images"),
    dropLabel: t("tools.scanner.chooseOrDropABarcodeImage"),
    buttonLabel: t("tools.scanner.scanBarcode"),
    emptyTitle: t("tools.scanner.noBarcodeImageLoadedYet"),
    emptyText: t("tools.scanner.chooseAFileToReadABarcodeFromAn"),
    resultLabel: t("tools.scanner.decodedBarcodeValue"),
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
const activeMode = ref<"upload" | "camera">("upload");
const isCameraRunning = ref(false);
const cameraDevices = ref<MediaDeviceInfo[]>([]);
const selectedCameraId = ref("");
const cameraStream = ref<MediaStream | null>(null);
let cameraRafId: number | null = null;
let lastScanAt = 0;

onMounted(() => {
  supportsNativeScanner.value = Boolean((window as any).BarcodeDetector);
  supportsCameraInput.value =
    typeof navigator !== "undefined" &&
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
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    error.value =
      "Camera API is unavailable. Use HTTPS (or localhost) and a modern browser.";
    return;
  }

  stopCamera();
  error.value = "";
  activeMode.value = "camera";

  const candidateConstraints: MediaStreamConstraints[] = [
    {
      audio: false,
      video: selectedCameraId.value
        ? { deviceId: { ideal: selectedCameraId.value } }
        : { facingMode: { ideal: "environment" } },
    },
    {
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    },
    {
      audio: false,
      video: true,
    },
  ];

  let stream: MediaStream | null = null;
  let lastError: unknown = null;

  for (const constraints of candidateConstraints) {
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      break;
    } catch (cameraError) {
      lastError = cameraError;
    }
  }

  if (!stream) {
    const cameraError = lastError as DOMException | null;
    if (cameraError?.name === "NotAllowedError") {
      error.value =
        "Camera permission was denied. Please allow camera access in your browser settings and try again.";
    } else if (cameraError?.name === "NotFoundError") {
      error.value =
        "No camera was found on this device, or it is currently unavailable.";
    } else if (cameraError?.name === "NotReadableError") {
      error.value =
        "Camera is being used by another app. Close other camera apps and try again.";
    } else {
      error.value =
        "Unable to access camera. Please allow permission and check your browser settings.";
    }
    stopCamera();
    return;
  }

  try {
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

async function activateCameraMode() {
  activeMode.value = "camera";
  if (!isCameraRunning.value) {
    await startCamera();
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
          cameraScanRegion.value,
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
const cameraScanRegion = computed<ImageCodeScanRegion>(() =>
  props.mode === "qr"
    ? { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }
    : { x: 0.1, y: 0.33, width: 0.8, height: 0.34 },
);
const cameraFrameStyle = computed(() => ({
  left: `${cameraScanRegion.value.x * 100}%`,
  top: `${cameraScanRegion.value.y * 100}%`,
  width: `${cameraScanRegion.value.width * 100}%`,
  height: `${cameraScanRegion.value.height * 100}%`,
}));
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-slate-950 dark:text-white">
        {{ scannerCopy.title }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-white/60">
        {{ scannerCopy.intro }}
      </p>
    </div>

    <section
      class="space-y-4 rounded-xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
          <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ t("tools.scanner.scanSource") }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-white/55">
            {{ t("tools.scanner.useImageUploadOrLiveCameraScanning") }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              activeMode === 'upload'
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:!bg-white dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]'
            "
            @click="activeMode = 'upload'"
          >
            {{ t("tools.scanner.uploadImage") }}
          </button>

          <button
            type="button"
            class="rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              activeMode === 'camera'
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:!bg-white dark:text-slate-950'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]'
            "
            @click="activateCameraMode"
          >
            {{ t("tools.scanner.camera") }}
          </button>

          <button
            type="button"
            class="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:!bg-white dark:text-slate-950 dark:hover:!bg-slate-100"
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
                  ? t("tools.scanner.scanning")
                  : scannerCopy.buttonLabel
                : t("tools.scanner.stopCamera")
            }}
          </button>

          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="loading"
            @click="activeMode === 'upload' ? openPicker() : startCamera()"
          >
            {{
              activeMode === "upload"
                ? t("tools.scanner.replaceImage")
                : t("tools.scanner.startCamera")
            }}
          </button>

          <button
            type="button"
            class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
            :disabled="!previewUrl && !results.length && !error"
            @click="clearAll"
          >
            {{ t("tools.scanner.clear") }}
          </button>
        </div>
      </div>

      <div
        v-if="activeMode === 'camera'"
        class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04] md:grid-cols-[1fr_auto]"
      >
        <label class="space-y-1 text-xs text-slate-500 dark:text-white/50">
          {{ t("tools.scanner.cameraDevice") }}
          <ModernSelect
            v-model="selectedCameraId"
            class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            @change="onCameraChange"
          >
            <option
              v-for="(device, index) in cameraDevices"
              :key="device.deviceId || `camera-${index}`"
              :value="device.deviceId"
            >
              {{ device.label || (t("tools.scanner.camera_2", { index: index + 1 })) }}
            </option>
          </ModernSelect>
        </label>

        <button
          type="button"
          class="self-end rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.12]"
          @click="refreshCameraDevices"
        >
          {{ t("tools.scanner.refreshCameras") }}
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
              {{ t("tools.scanner.dragAndDropAnImageHereOrClickTo") }}
            </p>
          </div>

          <span
            class="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition group-hover:bg-slate-800 dark:!bg-white dark:text-slate-950 dark:group-hover:!bg-slate-100"
          >
            {{ t("tools.scanner.chooseImage") }}
          </span>
        </div>
      </label>

      <p v-if="error" class="text-sm text-red-600 dark:text-red-300">
        {{ localizeToolError(error, isKhmer) }}
      </p>

      <p
        v-if="!supportsNativeScanner"
        class="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-300/20 dark:bg-blue-300/10 dark:text-blue-100"
      >
        {{ t("tools.scanner.runningInCompatibilityModeForThisBrowserScanningStill") }}
      </p>

      <p
        v-if="activeMode === 'camera' && !supportsCameraInput"
        class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"
      >
        {{ t("tools.scanner.cameraIsNotAvailableInThisBrowserTryLatest") }}
      </p>

      <div
        v-if="previewUrl || activeMode === 'camera'"
        class="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]"
      >
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ t("tools.scanner.preview") }}
          </h3>
          <div
            class="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.05]"
          >
            <img
              v-if="activeMode === 'upload' && previewUrl"
              :src="previewUrl"
              :alt="t(&quot;tools.scanner.uploadedImage&quot;, { scannerCopyFormatLabelToLowerCase: scannerCopy.formatLabel.toLowerCase(), scannerCopyFormatLabel: scannerCopy.formatLabel })"
              class="max-h-[420px] w-full rounded-xl object-contain"
              loading="lazy"
              decoding="async"
            />

            <video
              v-else
              ref="cameraVideo"
              class="max-h-[420px] w-full rounded-xl bg-black object-cover"
              autoplay
              muted
              playsinline
            />

            <template v-if="activeMode === 'camera'">
              <div class="pointer-events-none absolute inset-0 bg-black/30" />
              <div
                class="pointer-events-none absolute rounded-2xl border-2 border-white/85 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]"
                :style="cameraFrameStyle"
              >
                <span class="absolute -left-1 -top-1 h-4 w-4 border-l-4 border-t-4 border-cyan-300" />
                <span class="absolute -right-1 -top-1 h-4 w-4 border-r-4 border-t-4 border-cyan-300" />
                <span class="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-cyan-300" />
                <span class="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-cyan-300" />
              </div>
            </template>
          </div>

          <p
            v-if="activeMode === 'camera'"
            class="text-xs text-slate-500 dark:text-white/55"
          >
            {{ t("tools.scanner.placeTheInsideTheFrameForFasterDetection", { scannerCopyFormatLabelToLowerCase: scannerCopy.formatLabel.toLowerCase(), scannerCopyFormatLabel: scannerCopy.formatLabel }) }}
          </p>
        </div>

        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ t("tools.scanner.result") }}
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
                :label="t(&quot;tools.scanner.copy&quot;)"
                variant="secondary"
              />
            </div>

            <div v-if="primaryResult" class="mt-4 space-y-2">
              <p class="text-xs text-slate-500 dark:text-white/50">
                {{ t("tools.scanner.format") }}: {{ humanizeFormat(primaryResult.format) }}
              </p>

              <p class="text-xs text-slate-500 dark:text-white/50">
                {{ t("tools.scanner.decodedItem", { resultsLength: results.length, resultsLengthS: results.length === 1 ? '' : 's' }) }}
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
              {{ t("tools.scanner.fileInfo") }}
            </p>
            <p
              class="mt-2 break-words text-sm font-semibold text-slate-950 dark:text-white"
            >
              {{
                activeMode === "upload"
                  ? selectedFileName || (t("tools.scanner.noFileSelected"))
                  : isCameraRunning
                    ? t("tools.scanner.cameraIsActive")
                    : t("tools.scanner.cameraIsNotActive")
              }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
              {{
                activeMode === "upload"
                  ? t("tools.scanner.theImageStaysLocalInYourBrowserWhileIt")
                  : t("tools.scanner.cameraFramesAreProcessedLocallyInYourBrowser")
              }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section
      v-if="multipleResults.length > 0"
      class="space-y-4 rounded-xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold text-slate-900 dark:text-white">
          {{ t("tools.scanner.additionalDecodedItems") }}
        </h2>
        <p class="text-xs text-slate-500 dark:text-white/50">
          {{ t("tools.scanner.more", { multipleResultsLength: multipleResults.length }) }}
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
              :label="t(&quot;tools.scanner.copy&quot;)"
              variant="secondary"
            />
          </div>
        </article>
      </div>
    </section>

    <section
      class="rounded-[22px] border border-white/80 bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/20 dark:border-white/10"
    >
      <div class="grid gap-4 lg:grid-cols-2">
        <div>
          <h2
            class="text-sm font-semibold uppercase tracking-wide text-white/70"
          >
            {{ t("tools.scanner.howItWorks") }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-white/80">
            {{ t("tools.scanner.chooseAClearImageLetTheBrowserDecodeIt") }}
          </p>
        </div>

        <ul class="space-y-2 text-sm leading-6 text-white/75">
          <li>• {{ scannerCopy.hint }}</li>
          <li>• {{ t("tools.scanner.theScanStaysOnYourDevice") }}</li>
          <li>• {{ t("tools.scanner.replaceTheImageWheneverYouNeedADifferentFile") }}</li>
        </ul>
      </div>
    </section>
  </div>
</template>
