<template>
  <aside class="space-y-4 rounded-xl border bg-gray-50 p-4">
    <div>
      <label for="page-size" class="block text-sm font-semibold text-gray-900">
        Page size
      </label>
      <select
        id="page-size"
        v-model="pageSize"
        class="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
      >
        <option v-for="option in PAGE_SIZE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label for="orientation" class="block text-sm font-semibold text-gray-900">
        Orientation
      </label>
      <select
        id="orientation"
        v-model="orientation"
        class="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
      >
        <option
          v-for="option in ORIENTATION_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label for="margin" class="block text-sm font-semibold text-gray-900">
        Margin
      </label>
      <select
        id="margin"
        v-model="margin"
        class="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
      >
        <option v-for="option in MARGIN_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label for="images-per-page" class="block text-sm font-semibold text-gray-900">
        Images per page
      </label>
      <select
        id="images-per-page"
        v-model="imagesPerPage"
        class="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
      >
        <option
          v-for="option in IMAGES_PER_PAGE_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p class="mt-2 text-xs text-gray-500">
        Drag images between page cards to reshuffle the preview.
      </p>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-3">
      <p class="text-sm font-semibold text-gray-900">Current settings</p>
      <div class="mt-2 space-y-1 text-sm text-gray-600">
        <p>Page: {{ pageSizeLabel }}</p>
        <p>Orientation: {{ orientationLabel }}</p>
        <p>Margin: {{ marginLabel }}</p>
        <p>Layout: {{ imagesPerPageLabel }}</p>
        <p>Pages: {{ pageCount }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import {
  IMAGES_PER_PAGE_OPTIONS,
  MARGIN_OPTIONS,
  ORIENTATION_OPTIONS,
  PAGE_SIZE_OPTIONS,
  type PdfImagesPerPage,
  type PdfMargin,
  type PdfOrientation,
  type PdfPageSize,
} from "~/composables/useImageToPdfTool";

const pageSize = defineModel<PdfPageSize>("pageSize", { required: true });
const orientation = defineModel<PdfOrientation>("orientation", { required: true });
const margin = defineModel<PdfMargin>("margin", { required: true });
const imagesPerPage = defineModel<PdfImagesPerPage>("imagesPerPage", { required: true });

const {
  pageSizeLabel,
  orientationLabel,
  marginLabel,
  imagesPerPageLabel,
  pageCount,
} = defineProps<{
  pageSizeLabel: string;
  orientationLabel: string;
  marginLabel: string;
  imagesPerPageLabel: string;
  pageCount: number;
}>();
</script>
