<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.pdfPreview") }}</h2>
      <span class="text-xs text-gray-500 dark:text-white/55">
        {{ t(pageCount === 1 ? "tools.imageToPdf.pageTotalCount.one" : "tools.imageToPdf.pageTotalCount.other", { count: pageCount }) }}
      </span>
    </div>

    <ClientOnly>
      <div class="space-y-5">
        <article v-for="(page, pageIndex) in pages" :key="page.id" class="space-y-2">
          <div
            class="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
            :style="pageAspectStyle"
          >
            <div class="flex h-full min-h-0 flex-col gap-3">
              <div class="flex items-center justify-between gap-3 px-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.page") }} {{ pageIndex + 1 }}</p>
                <p class="text-xs text-gray-500 dark:text-white/55">
                  {{ t(imagesPerPage === 1 ? "tools.imageToPdf.imagesOnPage.one" : "tools.imageToPdf.imagesOnPage.other", { count: page.images.length, perPage: imagesPerPage }) }}
                </p>
              </div>

              <div
                class="min-h-0 flex-1 rounded-[1.25rem] border border-dashed border-gray-200 bg-gray-50/70 p-3 dark:border-white/10 dark:bg-black/20"
              >
                <Draggable
                  v-model="page.images"
                  item-key="id"
                  tag="div"
                  class="grid h-full min-h-0 gap-3"
                  :class="pageGridClass"
                  :group="dragGroup"
                  handle=".drag-handle"
                  :animation="180"
                  ghost-class="pdf-image-ghost"
                  chosen-class="pdf-image-chosen"
                  drag-class="pdf-image-drag"
                  @start="$emit('drag-start')"
                  @end="$emit('drag-end')"
                >
                  <template #item="{ element: image, index }">
                    <article
                      class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white transition duration-200 dark:bg-white/[0.06]"
                      :class="
                        isSorting
                          ? 'border-gray-300 shadow-lg shadow-gray-900/10 dark:border-white/30 dark:shadow-black/25'
                          : 'border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md dark:border-white/10 dark:hover:border-white/25 dark:hover:bg-white/[0.08]'
                      "
                    >
                      <div class="relative min-h-0 flex-1 bg-gray-50 dark:bg-black/20">
                        <img
                          :src="image.previewUrl"
                          :alt="image.name"
                          class="h-full w-full object-contain"
                        />

                        <button
                          type="button"
                          class="drag-handle absolute right-2 top-2 inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition hover:border-gray-300 hover:bg-white hover:text-gray-900 active:cursor-grabbing dark:border-white/10 dark:bg-gray-950/90 dark:text-white/75 dark:hover:border-white/25 dark:hover:bg-gray-800 dark:hover:text-white"
                          :aria-label="t(&quot;tools.imageToPdf.dragToReorder&quot;)"
                          :title="t(&quot;tools.imageToPdf.dragToReorder&quot;)"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            class="h-5 w-5"
                            stroke="currentColor"
                            stroke-width="1.9"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M9 5h2" />
                            <path d="M13 5h2" />
                            <path d="M9 12h2" />
                            <path d="M13 12h2" />
                            <path d="M9 19h2" />
                            <path d="M13 19h2" />
                          </svg>
                        </button>
                      </div>

                      <div class="space-y-2 border-t border-gray-100 p-3 dark:border-white/10">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {{ index + 1 }}. {{ image.name }}
                          </p>
                          <p class="text-xs text-gray-500 dark:text-white/55">
                            {{ image.sizeLabel }}
                          </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white"
                            :disabled="isFirstImage(pageIndex, index)"
                            @click="$emit('move-image', pageIndex, index, -1)"
                          >{{ t("tools.imageToPdf.up") }}</button>
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-white"
                            :disabled="isLastImage(pageIndex, index)"
                            @click="$emit('move-image', pageIndex, index, 1)"
                          >{{ t("tools.imageToPdf.down") }}</button>
                          <button
                            type="button"
                            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200 dark:hover:bg-red-400/15"
                            @click="$emit('remove-image', pageIndex, index)"
                          >{{ t("tools.imageToPdf.remove") }}</button>
                        </div>
                      </div>
                    </article>
                  </template>
                </Draggable>

                <div
                  v-if="emptySlotCount(page.images.length) > 0"
                  class="mt-3 grid gap-3"
                  :class="pageGridClass"
                >
                  <div
                    v-for="slot in emptySlotCount(page.images.length)"
                    :key="slot"
                    class="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 text-[11px] font-medium text-gray-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/35"
                  >{{ t("tools.imageToPdf.emptySlot") }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 px-2">
            <p class="text-center text-xs text-gray-500 dark:text-white/55">
              {{ t("tools.imageToPdf.pdfPage") }} {{ pageIndex + 1 }}
            </p>
            <p
              v-if="emptySlotCount(page.images.length) > 0"
              class="rounded-full border border-dashed border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/40"
            >
              {{ t(emptySlotCount(page.images.length) === 1 ? "tools.imageToPdf.emptySlotCount.one" : "tools.imageToPdf.emptySlotCount.other", { count: emptySlotCount(page.images.length) }) }}
            </p>
          </div>
        </article>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
const { isKhmer } = useLanguage();
import Draggable from "vuedraggable";
import type {
  PdfImagesPerPage,
  PdfPage,
} from "~/composables/useImageToPdfTool";

const { t } = useAppI18n();

const props = defineProps<{
  pages: PdfPage[];
  imagesPerPage: PdfImagesPerPage;
  pageGridClass: string;
  pageAspectStyle: Record<string, string>;
  isSorting: boolean;
}>();

defineEmits<{
  (event: "remove-image", pageIndex: number, imageIndex: number): void;
  (event: "move-image", pageIndex: number, imageIndex: number, direction: -1 | 1): void;
  (event: "drag-start"): void;
  (event: "drag-end"): void;
}>();

const dragGroup = {
  name: "pdf-images",
  pull: true,
  put: true,
};

const pageCount = computed(() => props.pages.length);

function getGlobalImageIndex(pageIndex: number, imageIndex: number) {
  return (
    props.pages
      .slice(0, pageIndex)
      .reduce((sum, page) => sum + page.images.length, 0) + imageIndex
  );
}

function isFirstImage(pageIndex: number, imageIndex: number) {
  return getGlobalImageIndex(pageIndex, imageIndex) === 0;
}

function isLastImage(pageIndex: number, imageIndex: number) {
  const totalImages = props.pages.reduce((sum, page) => sum + page.images.length, 0);
  return getGlobalImageIndex(pageIndex, imageIndex) === totalImages - 1;
}

function emptySlotCount(usedImages: number) {
  return Math.max(props.imagesPerPage - usedImages, 0);
}
</script>
