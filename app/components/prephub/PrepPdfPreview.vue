<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  LoaderCircle,
} from "lucide-vue-next";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { PREP_MAX_FILE_BYTES } from "~/lib/prephub-attachments";
const props = defineProps<{ url: string; thumbnail?: boolean }>();
const { t } = useAppI18n();
const canvas = ref<HTMLCanvasElement | null>(null);
const host = ref<HTMLElement | null>(null);
const pdf = shallowRef<PDFDocumentProxy | null>(null);
const page = ref(1),
  loading = ref(true),
  rendering = ref(false),
  failed = ref(false);
let version = 0,
  renderVersion = 0;
let controller: AbortController | undefined;
let task: PDFDocumentLoadingTask | undefined;
let drawing: RenderTask | undefined;
let observer: ResizeObserver | undefined;
let visibilityObserver: IntersectionObserver | undefined;
let thumbnailStarted = false;
let disposed = false;
let resizeFrame: number | undefined;
let cleanupDone = Promise.resolve();
function clear() {
  controller?.abort();
  const previousRender = drawing;
  previousRender?.cancel();
  drawing = undefined;
  const previous = task;
  task = undefined;
  pdf.value = null;
  cleanupDone = Promise.all([
    cleanupDone,
    previousRender?.promise.catch(() => {}),
    previous?.destroy().catch(() => {}),
  ]).then(() => {});
  return cleanupDone;
}
async function draw() {
  const document = pdf.value;
  const target = canvas.value;
  if (!document || !target) return;
  const current = ++renderVersion;
  rendering.value = true;
  try {
    const previous = drawing;
    if (previous) {
      previous.cancel();
      await previous.promise.catch(() => {});
    }
    if (current !== renderVersion || document !== pdf.value) return;
    const pdfPage = await document.getPage(page.value);
    if (current !== renderVersion || document !== pdf.value) return;
    const normal = pdfPage.getViewport({ scale: 1 });
    if (
      !Number.isFinite(normal.width * normal.height) ||
      normal.width <= 0 ||
      normal.height <= 0
    )
      throw new Error("Invalid page dimensions");
    const width = Math.max(
      240,
      Math.min(
        props.thumbnail ? 420 : 1200,
        (host.value?.clientWidth || 760) - 32,
      ),
    );
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    let scale = (width / normal.width) * ratio;
    // Bound canvas allocation even for unusually tall or malformed PDF pages.
    scale = Math.min(
      scale,
      Math.sqrt(
        (props.thumbnail ? 1_000_000 : 6_000_000) /
          (normal.width * normal.height),
      ),
    );
    const viewport = pdfPage.getViewport({ scale });
    target.width = Math.ceil(viewport.width);
    target.height = Math.ceil(viewport.height);
    target.style.width = `${viewport.width / ratio}px`;
    target.style.height = `${viewport.height / ratio}px`;
    const context = target.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    const render = pdfPage.render({
      canvas: target,
      canvasContext: context,
      viewport,
    });
    drawing = render;
    await render.promise;
  } catch (error) {
    if (
      current === renderVersion &&
      (error as Error).name !== "RenderingCancelledException"
    )
      failed.value = true;
  } finally {
    if (current === renderVersion) rendering.value = false;
  }
}
async function load() {
  if (disposed) return;
  thumbnailStarted = true;
  const current = ++version;
  renderVersion++;
  loading.value = true;
  failed.value = false;
  page.value = 1;
  await clear();
  if (current !== version) return;
  controller = new AbortController();
  try {
    const response = await fetch(props.url, {
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (
      !response.ok ||
      response.headers.get("content-type")?.split(";")[0] !==
        "application/pdf" ||
      Number(response.headers.get("content-length")) > PREP_MAX_FILE_BYTES
    )
      throw new Error("Preview unavailable");
    const data = new Uint8Array(await response.arrayBuffer());
    if (!data.length || data.length > PREP_MAX_FILE_BYTES)
      throw new Error("Invalid PDF size");
    const [engine, worker] = await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]);
    if (current !== version) return;
    engine.GlobalWorkerOptions.workerSrc = worker.default;
    // Cap rendered canvas size rather than dropping high-resolution scans from the PDF.
    const nextTask = engine.getDocument({
      data,
      enableXfa: false,
      useWorkerFetch: false,
      canvasMaxAreaInBytes: 24_000_000,
    });
    task = nextTask;
    // Password-protected PDFs remain downloadable; do not leave an unresolved password prompt spinning.
    nextTask.onPassword = () => {
      if (current === version) {
        failed.value = true;
        loading.value = false;
      }
      void nextTask.destroy().catch(() => {});
    };
    const document = await nextTask.promise;
    if (current !== version) return;
    pdf.value = document;
    loading.value = false;
    await nextTick();
    await draw();
    if (props.thumbnail && current === version) {
      // A static gallery cover only needs its first painted page, not a resident PDF worker.
      const completed = task;
      drawing = undefined;
      task = undefined;
      pdf.value = null;
      await completed?.destroy();
    }
  } catch {
    if (current === version) failed.value = true;
  } finally {
    if (current === version) loading.value = false;
  }
}
watch(page, () => {
  void draw();
});
watch(
  () => props.url,
  () => {
    void load();
  },
);
onMounted(() => {
  if (
    props.thumbnail &&
    typeof IntersectionObserver !== "undefined" &&
    host.value
  ) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (
          !thumbnailStarted &&
          entries.some((entry) => entry.isIntersecting)
        ) {
          visibilityObserver?.disconnect();
          void load();
        }
      },
      { rootMargin: "150px" },
    );
    visibilityObserver.observe(host.value);
  } else void load();
  if (!props.thumbnail && typeof ResizeObserver !== "undefined" && host.value) {
    observer = new ResizeObserver(() => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        void draw();
      });
    });
    observer.observe(host.value);
  }
});
onBeforeUnmount(() => {
  disposed = true;
  version++;
  renderVersion++;
  observer?.disconnect();
  visibilityObserver?.disconnect();
  if (resizeFrame) cancelAnimationFrame(resizeFrame);
  void clear();
});
</script>
<template>
  <div
    class="flex min-h-0 flex-1 flex-col"
    :class="{ 'h-full': thumbnail }"
    :aria-hidden="thumbnail || undefined"
  >
    <div
      v-if="pdf && !failed && !thumbnail"
      class="flex shrink-0 items-center justify-center gap-3 border-b border-slate-200 bg-white px-3 py-1 dark:border-white/10 dark:bg-neutral-950"
    >
      <button
        type="button"
        class="prep-icon"
        :disabled="rendering || page === 1"
        :aria-label="t('prephub.attachments.previousPage')"
        @click="page--"
      >
        <ChevronLeft class="size-4" aria-hidden="true" />
      </button>
      <span class="text-xs tabular-nums text-slate-500">{{
        t("prephub.attachments.page", { current: page, total: pdf.numPages })
      }}</span>
      <button
        type="button"
        class="prep-icon"
        :disabled="rendering || page === pdf.numPages"
        :aria-label="t('prephub.attachments.nextPage')"
        @click="page++"
      >
        <ChevronRight class="size-4" aria-hidden="true" />
      </button>
    </div>
    <div
      ref="host"
      class="relative min-h-0 flex-1"
      :class="thumbnail ? 'overflow-hidden p-3' : 'overflow-auto p-4'"
    >
      <div
        v-if="loading || (thumbnail && rendering)"
        role="status"
        class="grid h-full content-center justify-items-center gap-3 text-sm text-slate-500"
      >
        <LoaderCircle class="size-6 animate-spin" aria-hidden="true" /><span
          v-if="!thumbnail"
          >{{ t("prephub.attachments.loading") }}</span
        >
      </div>
      <div
        v-else-if="failed && !thumbnail"
        role="alert"
        class="grid h-full content-center justify-items-center gap-4 px-4 text-center text-sm text-slate-500"
      >
        <p>{{ t("prephub.attachments.failed") }}</p>
        <button type="button" class="prep-button" @click="load">
          {{ t("prephub.retry") }}
        </button>
      </div>
      <div
        v-else-if="failed"
        class="grid h-full place-items-center text-slate-400"
      >
        <FileText class="size-12" aria-hidden="true" />
      </div>
      <canvas
        v-show="!loading && !failed && !(thumbnail && rendering)"
        ref="canvas"
        class="mx-auto block rounded bg-white shadow-sm"
        :class="{ '!size-full object-contain': thumbnail }"
        :aria-label="
          t('prephub.attachments.page', {
            current: page,
            total: pdf?.numPages || 1,
          })
        "
      />
    </div>
  </div>
</template>
