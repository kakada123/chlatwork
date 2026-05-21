<template>
  <aside class="space-y-4 rounded-xl border bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div>
      <label :for="fieldId('page-size')" class="block text-sm font-semibold text-gray-900 dark:text-white">
        Page size
      </label>
      <select
        :id="fieldId('page-size')"
        v-model="pageSize"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option v-for="option in PAGE_SIZE_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label :for="fieldId('orientation')" class="block text-sm font-semibold text-gray-900 dark:text-white">
        Orientation
      </label>
      <select
        :id="fieldId('orientation')"
        v-model="orientation"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
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
      <label :for="fieldId('margin')" class="block text-sm font-semibold text-gray-900 dark:text-white">
        Margin
      </label>
      <select
        :id="fieldId('margin')"
        v-model="margin"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option v-for="option in MARGIN_OPTIONS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div>
      <label :for="fieldId('images-per-page')" class="block text-sm font-semibold text-gray-900 dark:text-white">
        Images per page
      </label>
      <select
        :id="fieldId('images-per-page')"
        v-model="imagesPerPage"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option
          v-for="option in IMAGES_PER_PAGE_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <p class="mt-2 text-xs text-gray-500 dark:text-white/55">
        Drag images between page cards to reshuffle the preview.
      </p>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.06]">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">Current settings</p>
      <div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-white/65">
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
  idSuffix = "",
} = defineProps<{
  pageSizeLabel: string;
  orientationLabel: string;
  marginLabel: string;
  imagesPerPageLabel: string;
  pageCount: number;
  idSuffix?: string;
}>();

function fieldId(name: string) {
  return idSuffix ? `${name}-${idSuffix}` : name;
}
</script>
