<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";
import { useLanguage } from "~/composables/useLanguage";

const { localizeTool } = useLanguage();

const pdfCategory = TOOL_DIRECTORY_CATEGORIES.find(
  (category) => category.key === "pdf",
);
const { websiteEnabled } = useFeatureAvailability();
const pdfTools = computed(() =>
  pdfCategory
    ? getToolsForDirectoryCategory(pdfCategory).filter((tool) => websiteEnabled(tool.key)).map(localizeTool)
    : [],
);

useSeoMeta({
  title: computed(() => t("shared.pdf_directory.pdf_tools_online_chlat_work")),
  description: computed(() => t("shared.pdf_directory.free_browser_side_pdf_tools_for_converting_merging_splitting")),
  ogTitle: computed(() => t("shared.pdf_directory.pdf_tools_online_chlat_work")),
  ogDescription: computed(() => t("shared.pdf_directory.free_browser_side_pdf_tools_for_converting_merging_splitting")),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/pdf",
  twitterCard: "summary_large_image",
});

useHead({
  link: [
    {
      rel: "canonical",
      href: "https://chlatwork.com/tools/pdf",
    },
  ],
});
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-8">
    <header class="space-y-3">
      <NuxtLink
        to="/tools"
        class="hidden text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200 sm:inline-flex"
      >
        {{ t("shared.pdf_directory.all_tools") }}
      </NuxtLink>

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300">
          {{ t("shared.pdf_directory.local_first_document_tools") }}
        </p>
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          {{ t("shared.pdf_directory.pdf_tools") }}
        </h1>
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ t("shared.pdf_directory.convert_merge_split_remove_pages_reorder_pages_and_create")
          }}
        </p>
      </div>
    </header>

    <section
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    >
      <p class="font-semibold">{{ t("shared.pdf_directory.privacy_first_pdf_processing") }}</p>
      <p class="mt-1 text-xs opacity-80">
        {{ t("shared.pdf_directory.privacy_note") }}
      </p>
    </section>

    <p v-if="!pdfTools.length" class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65">
      {{ t("shared.pdf_directory.pdf_tools_are_temporarily_unavailable") }}
    </p>

    <section v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ToolDirectoryCard
        v-for="tool in pdfTools"
        :key="tool.key"
        :tool-key="tool.key"
        :name="tool.name"
        :route="tool.route"
      />
    </section>
  </main>
</template>
