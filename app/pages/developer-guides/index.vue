<script setup lang="ts">
import { DEVELOPER_GUIDES } from "~/data/developer-guides";
import { Code2 } from "lucide-vue-next";

const title = "Developer Deployment Guides | ChlatWork";
const description = "Production-focused guides for Ubuntu, NestJS, Docker, AWS EC2, PostgreSQL, Redis, Nginx, PM2, and SSL.";
const canonical = "https://chlatwork.com/developer-guides";
useSeoMeta({ title, description, ogTitle: title, ogDescription: description, ogType: "website", ogUrl: canonical, twitterCard: "summary_large_image" });
useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template>
  <main class="mx-auto w-full max-w-[1200px] space-y-6 text-slate-950 dark:text-white">
    <header class="border-b border-slate-200 pb-4 dark:border-slate-800">
      <h1 class="text-3xl font-black sm:text-4xl">Developer Guides</h1>
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <NuxtLink to="/developer-commands" class="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white dark:bg-cyan-300 dark:text-slate-950">Open Command Hub</NuxtLink>
        <span class="text-xs text-slate-500 dark:text-slate-400">{{ DEVELOPER_GUIDES.length }} production runbooks</span>
      </div>
    </header>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Developer guides">
      <NuxtLink v-for="(guide, index) in DEVELOPER_GUIDES" :key="guide.slug" :to="guide.path" class="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]">
        <span class="tool-icon-tone tool-icon-tone-indigo flex size-11 shrink-0 items-center justify-center rounded-xl" aria-hidden="true"><Code2 class="size-6" /></span>
        <span class="min-w-0"><span class="flex items-center justify-between gap-3 text-xs font-medium text-slate-500 dark:text-slate-400"><span>Guide 0{{ index + 1 }}</span><span>{{ guide.duration }}</span></span><strong class="mt-2 block text-lg font-semibold group-hover:text-sky-700 dark:group-hover:text-cyan-300">{{ guide.title }}</strong><span class="mt-2 line-clamp-2 block text-sm leading-5 text-slate-600 dark:text-white/60">{{ guide.summary }}</span></span>
      </NuxtLink>
    </section>
  </main>
</template>
