<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Image to PDF Converter</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-white/60">
        Convert JPG, PNG, WebP, and HEIC images into one clean PDF file instantly.
      </p>
      <p class="mt-2 text-xs font-medium text-gray-400 dark:text-white/45">
        Drag images inside the preview to change PDF order.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div class="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_320px]">
        <div class="space-y-4">
          <ImageToPdfUploadCard
            :key="uploadKey"
            :image-count="imageCount"
            :can-convert="canConvert"
            :is-generating="isGenerating"
            :is-preparing-files="isPreparingFiles"
            :error="error"
            @files-selected="addFiles"
            @convert="convertToPdf"
            @clear="clearAll"
          />

          <div class="lg:hidden">
            <ImageToPdfSettingsPanel
              v-model:page-size="pageSize"
              v-model:orientation="orientation"
              v-model:margin="margin"
              v-model:images-per-page="imagesPerPage"
              :page-size-label="pageSizeLabel"
              :orientation-label="orientationLabel"
              :margin-label="marginLabel"
              :images-per-page-label="imagesPerPageLabel"
              :page-count="pageCount"
              id-suffix="mobile"
            />
          </div>

          <ImageToPdfPreview
            v-if="imageCount > 0"
            :pages="pages"
            :images-per-page="imagesPerPage"
            :page-grid-class="pageGridClass"
            :page-aspect-style="pageAspectStyle"
            :is-sorting="isSorting"
            @remove-image="removeImage"
            @move-image="moveImage"
            @drag-start="isSorting = true"
            @drag-end="handlePageDragEnd"
          />
        </div>

        <div class="hidden lg:block">
          <ImageToPdfSettingsPanel
            v-model:page-size="pageSize"
            v-model:orientation="orientation"
            v-model:margin="margin"
            v-model:images-per-page="imagesPerPage"
            :page-size-label="pageSizeLabel"
            :orientation-label="orientationLabel"
            :margin-label="marginLabel"
            :images-per-page-label="imagesPerPageLabel"
            :page-count="pageCount"
            id-suffix="desktop"
          />
        </div>
      </div>
    </section>

    <ToolPageDetails
      v-if="toolGuide"
      :guide="toolGuide"
    />
  </div>
</template>

<script setup lang="ts">
import ToolPageDetails from "~/components/tools/ToolPageDetails.vue";
import { useImageToPdfTool } from "~/composables/useImageToPdfTool";
import { findToolGuideByToolRoute } from "~/data/tool-guides";

const {
  pages,
  pageSize,
  orientation,
  margin,
  imagesPerPage,
  uploadKey,
  isPreparingFiles,
  isSorting,
  isGenerating,
  error,
  imageCount,
  pageCount,
  canConvert,
  pageSizeLabel,
  orientationLabel,
  marginLabel,
  imagesPerPageLabel,
  pageGridClass,
  pageAspectStyle,
  addFiles,
  removeImage,
  moveImage,
  clearAll,
  convertToPdf,
  handlePageDragEnd,
} = useImageToPdfTool();
const toolGuide = findToolGuideByToolRoute("/tools/image-to-pdf");

useSeoMeta({
  title: "Image to PDF Converter - JPG, PNG, WebP, HEIC | ChlatWork",
  description:
    "Convert JPG, PNG, WebP, and HEIC images into one PDF. Reorder pages, choose page size and margins, then download locally.",
  ogTitle: "Image to PDF Converter - JPG, PNG, WebP, HEIC | ChlatWork",
  ogDescription:
    "Create one clean PDF from photos, scans, receipts, screenshots, or product images directly in your browser.",
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/image-to-pdf",
  twitterCard: "summary_large_image",
  twitterTitle: "Image to PDF Converter - JPG, PNG, WebP, HEIC | ChlatWork",
  twitterDescription:
    "Convert images into one ordered PDF with page size, orientation, and margin controls.",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/image-to-pdf",
    },
  ],
});

onBeforeUnmount(() => {
  clearAll();
});
</script>
