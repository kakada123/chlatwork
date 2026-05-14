<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-gray-900">PDF preview</h2>
      <span class="text-xs text-gray-500">
        {{ pageCount }} page{{ pageCount === 1 ? "" : "s" }} total
      </span>
    </div>

    <ClientOnly>
      <div class="space-y-5">
        <article v-for="(page, pageIndex) in pages" :key="page.id" class="space-y-2">
          <div
            class="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white p-3 shadow-sm"
            :style="pageAspectStyle"
          >
            <div class="flex h-full min-h-0 flex-col gap-3">
              <div class="flex items-center justify-between gap-3 px-1">
                <p class="text-sm font-semibold text-gray-900">Page {{ pageIndex + 1 }}</p>
                <p class="text-xs text-gray-500">
                  {{ page.images.length }} of
                  {{ imagesPerPage }}
                  image{{ imagesPerPage === 1 ? "" : "s" }}
                </p>
              </div>

              <div
                class="flex-1 min-h-0 rounded-[1.25rem] border border-dashed border-gray-200 bg-gray-50/70 p-3"
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
                      class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-white transition duration-200"
                      :class="
                        isSorting
                          ? 'border-gray-300 shadow-lg shadow-gray-900/10'
                          : 'border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md'
                      "
                    >
                      <div class="relative flex-1 min-h-0 bg-gray-50">
                        <img
                          :src="image.previewUrl"
                          :alt="image.name"
                          class="h-full w-full object-contain"
                        />

                        <button
                          type="button"
                          class="drag-handle absolute right-2 top-2 inline-flex h-10 w-10 cursor-grab items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition hover:border-gray-300 hover:bg-white hover:text-gray-900 active:cursor-grabbing"
                          aria-label="Drag to reorder"
                          title="Drag to reorder"
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

                      <div class="space-y-2 border-t border-gray-100 p-3">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-gray-900">
                            {{ index + 1 }}. {{ image.name }}
                          </p>
                          <p class="text-xs text-gray-500">
                            {{ image.sizeLabel }}
                          </p>
                        </div>

                        <div class="flex flex-wrap gap-2">
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            :disabled="isFirstImage(pageIndex, index)"
                            @click="$emit('move-image', pageIndex, index, -1)"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            :disabled="isLastImage(pageIndex, index)"
                            @click="$emit('move-image', pageIndex, index, 1)"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                            @click="$emit('remove-image', pageIndex, index)"
                          >
                            Remove
                          </button>
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
                    class="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/60 text-[11px] font-medium text-gray-400"
                  >
                    Empty slot
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 px-2">
            <p class="text-center text-xs text-gray-500">
              PDF page {{ pageIndex + 1 }}
            </p>
            <p
              v-if="emptySlotCount(page.images.length) > 0"
              class="rounded-full border border-dashed border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-400"
            >
              {{ emptySlotCount(page.images.length) }} empty slot{{
                emptySlotCount(page.images.length) === 1 ? "" : "s"
              }}
            </p>
          </div>
        </article>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import Draggable from "vuedraggable";
import type {
  PdfImagesPerPage,
  PdfPage,
} from "~/composables/useImageToPdfTool";

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
