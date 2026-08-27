<script setup lang="ts">
import GuideCommand from "~/components/developer-guides/GuideCommand.vue";
import { findDeveloperGuideByPath } from "~/data/developer-guides";

const route = useRoute();
const guide = computed(() => findDeveloperGuideByPath(route.path));
const canonical = computed(() => `https://chlatwork.com${guide.value?.path || "/developer-guides"}`);
watchEffect(() => { if (!guide.value) throw createError({ statusCode: 404, statusMessage: "Developer guide not found" }); });
useSeoMeta({
  title: computed(() => guide.value?.metaTitle || "Developer Guides | ChlatWork"),
  description: computed(() => guide.value?.metaDescription || ""),
  ogTitle: computed(() => guide.value?.metaTitle || "Developer Guides | ChlatWork"),
  ogDescription: computed(() => guide.value?.metaDescription || ""), ogType: "article", ogUrl: canonical,
  twitterCard: "summary_large_image",
});
useHead(() => ({ link: [{ rel: "canonical", href: canonical.value }], script: guide.value ? [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "TechArticle", headline: guide.value.title, description: guide.value.metaDescription, url: canonical.value, proficiencyLevel: guide.value.difficulty, publisher: { "@type": "Organization", name: "ChlatWork" } }) }] : [] }));
</script>

<template>
  <main v-if="guide" class="mx-auto w-full max-w-[1000px] text-slate-950 dark:text-white">
    <NuxtLink to="/developer-guides" class="hidden text-sm font-bold text-sky-700 hover:underline dark:text-cyan-300 sm:inline-flex">← All developer guides</NuxtLink>
    <header class="border-b border-slate-200 pb-7 dark:border-slate-700 sm:mt-5">
      <div class="flex flex-wrap gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><span>{{ guide.difficulty }}</span><span>•</span><span>{{ guide.duration }}</span></div>
      <h1 class="mt-3 text-3xl font-black leading-tight sm:text-5xl">{{ guide.title }}</h1>
      <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{{ guide.summary }}</p>
    </header>

    <div class="mt-7 grid gap-7 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h2 class="text-sm font-black">Before you start</h2>
          <ul class="mt-3 space-y-2 text-xs leading-5 text-slate-600 dark:text-slate-300"><li v-for="item in guide.prerequisites" :key="item">• {{ item }}</li></ul>
        </div>
      </aside>

      <article class="min-w-0 space-y-5">
        <section v-for="(step, index) in guide.steps" :key="step.title" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div class="flex gap-3"><span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-cyan-300 dark:text-slate-950">{{ index + 1 }}</span><div><h2 class="text-lg font-black">{{ step.title }}</h2><p class="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ step.description }}</p></div></div>
          <div v-if="step.commands?.length" class="mt-4 space-y-3"><GuideCommand v-for="snippet in step.commands" :key="snippet.command" :snippet="snippet" /></div>
          <p v-if="step.note" class="mt-4 rounded-xl bg-sky-50 p-3 text-xs leading-5 text-sky-900 dark:bg-cyan-300/10 dark:text-cyan-100"><strong>Note:</strong> {{ step.note }}</p>
          <p v-if="step.warning" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"><strong>Important:</strong> {{ step.warning }}</p>
        </section>

        <section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-400/30 dark:bg-emerald-400/10">
          <h2 class="text-lg font-black text-emerald-950 dark:text-emerald-100">Final verification</h2>
          <ul class="mt-3 space-y-2 text-sm leading-6 text-emerald-900 dark:text-emerald-100/90"><li v-for="item in guide.verification" :key="item">✓ {{ item }}</li></ul>
        </section>
        <div class="flex flex-wrap gap-3"><NuxtLink to="/developer-commands" class="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white dark:bg-cyan-300 dark:text-slate-950">Find related commands</NuxtLink><NuxtLink to="/developer-guides" class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-slate-600">Browse all guides</NuxtLink></div>
      </article>
    </div>
  </main>
</template>
