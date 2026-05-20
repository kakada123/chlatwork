<script setup lang="ts">
import { PDF_TOOLS } from "~/data/pdf-tools";
import { TOOL_ICON_CLASSES } from "~/lib/tool-registry";

useSeoMeta({
  title: "PDF Tools Online - ChlatWork",
  description:
    "Free browser-side PDF tools for converting, merging, splitting, compressing, removing pages, reordering pages, and generating invoices.",
  ogTitle: "PDF Tools Online - ChlatWork",
  ogDescription:
    "Free browser-side PDF tools for converting, merging, splitting, compressing, removing pages, reordering pages, and generating invoices.",
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
        class="inline-flex text-sm font-semibold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-200"
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
          Convert, merge, split, compress, remove pages, reorder pages, and create
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
        Files stay on your device and are processed locally in your browser. No upload needed.
      </p>
    </section>

    <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="tool in PDF_TOOLS"
        :key="tool.key"
        :to="tool.route"
        class="group flex h-full flex-col rounded-[22px] border border-white/80 bg-white/75 p-4 text-left shadow-lg shadow-sky-100/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.09] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14]"
      >
        <div class="flex items-start gap-3">
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-110 group-hover:-rotate-3 dark:ring-white/10"
            :class="TOOL_ICON_CLASSES[tool.key]"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-5 w-5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path v-for="path in tool.iconPaths" :key="path" :d="path" />
            </svg>
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
    </section>
  </main>
</template>
