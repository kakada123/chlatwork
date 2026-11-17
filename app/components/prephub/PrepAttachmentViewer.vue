<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Image,
  LoaderCircle,
  X,
} from "lucide-vue-next";
import type { PrepResource } from "~/lib/prephub";
import {
  canPreviewPrepResource,
  prepResourceUrl,
} from "~/lib/prephub-attachments";
import PrepPdfPreview from "./PrepPdfPreview.vue";
const props = defineProps<{
  resources: PrepResource[];
  initialId: string;
  subjectId: string;
  resourceBase?: string;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useAppI18n();
const activeId = ref(props.initialId);
const activeIndex = computed(() =>
  props.resources.findIndex((file) => file.id === activeId.value),
);
const active = computed(() => props.resources[activeIndex.value]);
const loading = ref(true),
  imageFailed = ref(false),
  imageVersion = ref(0);
const dialog = ref<HTMLDialogElement | null>(null),
  closeButton = ref<HTMLButtonElement | null>(null),
  thumbnails = ref<HTMLElement | null>(null);
const titleId = useId();
let previousFocus: HTMLElement | null = null;
const url = (file: PrepResource, preview = false) =>
  prepResourceUrl(props.subjectId, file.id, props.resourceBase, preview);
function move(direction: number) {
  const file = props.resources[activeIndex.value + direction];
  if (file) activeId.value = file.id;
}
function keydown(event: KeyboardEvent) {
  if (
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    (event.target as HTMLElement).closest(
      "input,textarea,select,[contenteditable=true]",
    )
  )
    return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }
}
function imageLoaded(event: Event, failed = false) {
  const source = (event.currentTarget as HTMLElement).dataset;
  if (
    source.resourceId !== activeId.value ||
    source.previewVersion !== String(imageVersion.value)
  )
    return;
  loading.value = false;
  imageFailed.value = failed;
}
async function revealThumbnail() {
  await nextTick();
  const selected = thumbnails.value?.querySelector<HTMLElement>(
    '[aria-pressed="true"]',
  );
  selected?.scrollIntoView({
    inline: "nearest",
    block: "nearest",
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}
watch(activeId, () => {
  imageVersion.value++;
  loading.value = true;
  imageFailed.value = false;
  void revealThumbnail();
});
watch(
  () => props.resources.map((file) => file.id).join(","),
  () => {
    if (!props.resources.length) emit("close");
    else if (!active.value) activeId.value = props.resources[0]!.id;
  },
);
watch(
  () => [props.subjectId, props.resourceBase],
  () => emit("close"),
);
onMounted(() => {
  previousFocus = document.activeElement as HTMLElement;
  dialog.value?.showModal();
  closeButton.value?.focus();
  void revealThumbnail();
});
onBeforeUnmount(() => {
  dialog.value?.close();
  if (previousFocus?.isConnected) previousFocus.focus();
});
</script>
<template>
  <dialog
    ref="dialog"
    class="prep-attachment-viewer"
    :aria-labelledby="titleId"
    @cancel.prevent="emit('close')"
    @keydown="keydown"
  >
    <div class="flex h-full min-h-0 flex-col">
      <header
        class="flex shrink-0 items-center gap-3 border-b border-slate-200 px-3 py-2 sm:px-5 dark:border-white/10"
      >
        <div class="min-w-0 flex-1">
          <h2
            :id="titleId"
            class="truncate text-sm font-semibold"
            :title="active?.title"
          >
            {{ active?.title || t("prephub.attachments.viewer") }}
          </h2>
          <p class="mt-0.5 text-xs tabular-nums text-slate-500">
            {{
              t("prephub.attachments.position", {
                current: activeIndex + 1,
                total: resources.length,
              })
            }}
          </p>
        </div>
        <a
          v-if="active"
          :href="url(active)"
          class="prep-icon"
          :aria-label="`${t('prephub.download')}: ${active.title}`"
          ><Download class="size-5" aria-hidden="true"
        /></a>
        <button
          ref="closeButton"
          type="button"
          class="prep-icon"
          :aria-label="t('prephub.close')"
          @click="emit('close')"
        >
          <X class="size-5" aria-hidden="true" />
        </button>
      </header>
      <div
        v-if="active"
        class="relative flex min-h-0 flex-1 bg-slate-100 dark:bg-black/40"
      >
        <PrepPdfPreview
          v-if="active.mimeType === 'application/pdf'"
          :key="active.id"
          :url="url(active, true)"
        />
        <div
          v-else-if="canPreviewPrepResource(active)"
          class="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-4 sm:p-8"
        >
          <div
            v-if="loading"
            role="status"
            class="absolute inset-0 grid content-center justify-items-center gap-3 text-sm text-slate-500"
          >
            <LoaderCircle class="size-6 animate-spin" aria-hidden="true" />{{
              t("prephub.attachments.loading")
            }}
          </div>
          <div
            v-if="imageFailed"
            role="alert"
            class="grid justify-items-center gap-4 px-5 text-center text-sm text-slate-500"
          >
            <p>{{ t("prephub.attachments.failed") }}</p>
            <button
              type="button"
              class="prep-button"
              @click="
                imageVersion++;
                loading = true;
                imageFailed = false;
              "
            >
              {{ t("prephub.retry") }}
            </button>
          </div>
          <img
            v-else
            :key="`${active.id}-${imageVersion}`"
            :src="url(active, true)"
            :alt="active.title"
            :data-resource-id="active.id"
            :data-preview-version="imageVersion"
            referrerpolicy="no-referrer"
            class="max-h-full max-w-full rounded object-contain"
            :class="{ 'opacity-0': loading }"
            @load="imageLoaded($event)"
            @error="imageLoaded($event, true)"
          />
        </div>
        <div
          v-else
          class="grid min-w-0 flex-1 content-center justify-items-center gap-4 p-8 text-center"
        >
          <FileText class="size-12 text-slate-400" aria-hidden="true" />
          <p class="max-w-sm text-sm text-slate-500">
            {{ t("prephub.attachments.unavailable") }}
          </p>
          <a class="prep-button" :href="url(active)"
            ><Download class="size-4" aria-hidden="true" />{{
              t("prephub.download")
            }}</a
          >
        </div>
      </div>
      <footer
        class="shrink-0 border-t border-slate-200 bg-white px-2 py-2 sm:px-4 dark:border-white/10 dark:bg-neutral-950"
      >
        <div
          v-if="resources.length > 1"
          class="flex min-w-0 items-center gap-1 sm:gap-3"
        >
          <button
            type="button"
            class="prep-icon"
            :disabled="activeIndex <= 0"
            :aria-label="t('prephub.attachments.previousFile')"
            @click="move(-1)"
          >
            <ChevronLeft class="size-5" aria-hidden="true" />
          </button>
          <nav
            ref="thumbnails"
            class="flex min-w-0 flex-1 gap-2 overflow-x-auto p-1"
            :aria-label="t('prephub.attachments.thumbnails')"
          >
            <button
              v-for="file in resources"
              :key="file.id"
              type="button"
              class="prep-viewer-thumbnail"
              :class="{ 'prep-viewer-thumbnail--active': activeId === file.id }"
              :aria-label="file.title"
              :aria-pressed="activeId === file.id"
              @click="activeId = file.id"
            >
              <span
                class="relative grid h-12 w-full place-items-center overflow-hidden rounded bg-slate-100 dark:bg-white/5"
                ><component
                  :is="file.mimeType.startsWith('image/') ? Image : FileText"
                  class="size-5 text-slate-400"
                  aria-hidden="true"
                /><img
                  v-if="
                    file.mimeType.startsWith('image/') &&
                    canPreviewPrepResource(file)
                  "
                  :src="url(file, true)"
                  alt=""
                  loading="lazy"
                  class="absolute inset-0 size-full object-cover"
                  @error="
                    (
                      $event.currentTarget as HTMLImageElement
                    ).style.visibility = 'hidden'
                  "
                /><span
                  v-if="file.mimeType === 'application/pdf'"
                  class="absolute bottom-0.5 right-0.5 rounded bg-white px-1 text-[9px] font-semibold text-slate-600 dark:bg-neutral-800 dark:text-white/70"
                  >PDF</span
                ></span
              >
              <span
                class="block w-full truncate text-[10px]"
                :title="file.title"
                >{{ file.title }}</span
              >
            </button>
          </nav>
          <button
            type="button"
            class="prep-icon"
            :disabled="activeIndex >= resources.length - 1"
            :aria-label="t('prephub.attachments.nextFile')"
            @click="move(1)"
          >
            <ChevronRight class="size-5" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  </dialog>
</template>
