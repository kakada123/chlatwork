<template>
  <aside class="space-y-4 rounded-xl border bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
    <div>
      <label :for="fieldId('page-size')" class="block text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.pageSize") }}</label>
      <ModernSelect
        :id="fieldId('page-size')"
        v-model="pageSize"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option v-for="option in PAGE_SIZE_OPTIONS" :key="option.value" :value="option.value">
          {{ localizePdfOption(option.label, isKhmer) }}
        </option>
      </ModernSelect>
    </div>

    <div>
      <label :for="fieldId('orientation')" class="block text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.orientation") }}</label>
      <ModernSelect
        :id="fieldId('orientation')"
        v-model="orientation"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option
          v-for="option in ORIENTATION_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ localizePdfOption(option.label, isKhmer) }}
        </option>
      </ModernSelect>
    </div>

    <div>
      <label :for="fieldId('margin')" class="block text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.margin") }}</label>
      <ModernSelect
        :id="fieldId('margin')"
        v-model="margin"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option v-for="option in MARGIN_OPTIONS" :key="option.value" :value="option.value">
          {{ localizePdfOption(option.label, isKhmer) }}
        </option>
      </ModernSelect>
    </div>

    <div>
      <label :for="fieldId('images-per-page')" class="block text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.imagesPerPage") }}</label>
      <ModernSelect
        :id="fieldId('images-per-page')"
        v-model="imagesPerPage"
        class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 dark:border-white/10 dark:bg-gray-950 dark:text-white dark:focus:ring-white/15"
      >
        <option
          v-for="option in IMAGES_PER_PAGE_OPTIONS"
          :key="option.value"
          :value="option.value"
        >
          {{ localizePdfOption(option.label, isKhmer) }}
        </option>
      </ModernSelect>
      <p class="mt-2 text-xs text-gray-500 dark:text-white/55">{{ t("tools.imageToPdf.dragImagesBetweenPageCardsToReshuffleThePreview") }}</p>
    </div>

    <div class="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.06]">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t("tools.imageToPdf.currentSettings") }}</p>
      <div class="mt-2 space-y-1 text-sm text-gray-600 dark:text-white/65">
        <p>{{ t("tools.imageToPdf.page_2") }} {{ localizePdfOption(pageSizeLabel, isKhmer) }}</p>
        <p>{{ t("tools.imageToPdf.orientation_2") }} {{ localizePdfOption(orientationLabel, isKhmer) }}</p>
        <p>{{ t("tools.imageToPdf.margin_2") }} {{ localizePdfOption(marginLabel, isKhmer) }}</p>
        <p>{{ t("tools.imageToPdf.layout") }} {{ localizePdfOption(imagesPerPageLabel, isKhmer) }}</p>
        <p>{{ t("tools.imageToPdf.pages") }} {{ pageCount }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizePdfOption } from "~/data/tool-ui-km";
const { isKhmer } = useLanguage();
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

const { t } = useAppI18n();

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
