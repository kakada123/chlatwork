<script setup lang="ts">
import { STARTER_GUIDES } from "~/data/guides";

const title = "ChlatWork Guides - Practical Tool Workflows";
const description =
  "Practical guides for QR codes, barcodes, PDF workflows, Khmer Unicode cleanup, and Cambodia-focused tool use.";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: "https://chlatwork.com/guides",
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/guides" }],
});
</script>

<template>
  <main
    class="mx-auto w-full max-w-[1180px] space-y-8 text-slate-950 dark:text-white"
  >
    <header class="space-y-3">
      <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
        Guides
      </p>
      <h1 class="text-3xl font-black sm:text-4xl">
        Practical ChlatWork guides
      </h1>
      <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/65">
        Short, practical guides for common workflows: QR sharing, barcode
        formats, PDF safety, PDF size reduction, and Khmer Unicode cleanup.
      </p>
      <div
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-300/25 dark:bg-amber-300/10 dark:text-amber-100/80"
      >
        Guides are reviewed against live tool behavior and updated when
        workflows, browser behavior, or policy requirements change. Last
        editorial review: June 29, 2026.
      </div>
    </header>

    <section class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="guide in STARTER_GUIDES"
        :key="guide.slug"
        :to="guide.path"
        class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
      >
        <p class="text-xs font-bold uppercase text-slate-400">Guide</p>
        <h2
          class="mt-2 text-xl font-black group-hover:text-sky-700 dark:group-hover:text-cyan-200"
        >
          {{ guide.title }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-white/65">
          {{ guide.summary }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <span
            class="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200"
          >
            {{ guide.primaryTool.label }}
          </span>
        </div>
      </NuxtLink>
    </section>
  </main>
</template>
