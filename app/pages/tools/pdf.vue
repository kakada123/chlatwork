<script setup lang="ts">
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";

const pdfCategory = TOOL_DIRECTORY_CATEGORIES.find(
  (category) => category.key === "pdf",
);
const { websiteEnabled } = useFeatureAvailability();
const pdfTools = computed(() =>
  pdfCategory
    ? getToolsForDirectoryCategory(pdfCategory).filter((tool) => websiteEnabled(tool.key))
    : [],
);

useSeoMeta({
  title: "PDF Tools Online - ChlatWork",
  description:
    "Free browser-side PDF tools for converting, merging, splitting, removing pages, reordering pages, and generating invoices.",
  ogTitle: "PDF Tools Online - ChlatWork",
  ogDescription:
    "Free browser-side PDF tools for converting, merging, splitting, removing pages, reordering pages, and generating invoices.",
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
        All tools
      </NuxtLink>

      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300">
          Local-first document tools
        </p>
        <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          PDF Tools
        </h1>
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
          Convert, merge, split, remove pages, reorder pages, and create
          simple PDFs directly in your browser. Files stay on your device whenever
          the browser can process them safely.
        </p>
      </div>
    </header>

    <section
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    >
      <p class="font-semibold">Privacy-first PDF processing</p>
      <p class="mt-1 text-xs opacity-80">
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
    </section>

    <p v-if="!pdfTools.length" class="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65">
      PDF tools are temporarily unavailable.
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
