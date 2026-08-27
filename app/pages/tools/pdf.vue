<script setup lang="ts">
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

const pdfCategory = TOOL_DIRECTORY_CATEGORIES.find(
  (category) => category.key === "pdf",
);
const pdfTools = pdfCategory ? getToolsForDirectoryCategory(pdfCategory) : [];

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

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="tool in pdfTools"
        :key="tool.key"
        class="group relative"
      >
        <NuxtLink :to="tool.route" class="flex h-full flex-col rounded-[22px] border border-white/80 bg-white/75 p-4 pr-12 text-left shadow-lg shadow-sky-100/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.09] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14]">
        <div class="flex items-start gap-3">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors"
            :class="getToolIconTone(tool.key)"
            aria-hidden="true"
          >
            <ToolIcon :name="tool.key" class="size-7" />
          </span>

          <div class="min-w-0">
            <h2 class="text-base font-black text-slate-950 dark:text-white">
              {{ tool.name }}
            </h2>
            <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-white/65">
              {{ tool.description }}
            </p>
          </div>
        </div>

        <div class="mt-auto flex items-center justify-between gap-3 pt-5">
          <span class="text-xs font-semibold uppercase text-slate-400">
            {{ tool.status }}
          </span>
          <span
            class="text-sm font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300"
          >
            Open
          </span>
        </div>
        </NuxtLink>
        <ToolFavoriteButton class="absolute right-3 top-3 z-10" :tool-key="tool.key" :tool-name="tool.name" />
      </div>
    </section>
  </main>
</template>
