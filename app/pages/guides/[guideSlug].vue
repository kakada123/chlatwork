<script setup lang="ts">
import { findStarterGuideByPath } from "~/data/guides";

const route = useRoute();
const siteUrl = "https://chlatwork.com";
const guide = computed(() => findStarterGuideByPath(route.path));
const canonicalUrl = computed(() =>
  guide.value ? `${siteUrl}${guide.value.path}` : `${siteUrl}/guides`,
);

watchEffect(() => {
  if (!guide.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Guide not found",
    });
  }
});

useSeoMeta({
  title: computed(() => guide.value?.metaTitle ?? "Guide - ChlatWork"),
  description: computed(() => guide.value?.metaDescription ?? ""),
  ogTitle: computed(() => guide.value?.metaTitle ?? "Guide - ChlatWork"),
  ogDescription: computed(() => guide.value?.metaDescription ?? ""),
  ogType: "article",
  ogUrl: canonicalUrl,
  ogImage: `${siteUrl}/og-home.png`,
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => guide.value?.metaTitle ?? "Guide - ChlatWork"),
  twitterDescription: computed(() => guide.value?.metaDescription ?? ""),
  twitterImage: `${siteUrl}/og-home.png`,
});

useHead(() => {
  const currentGuide = guide.value;

  if (!currentGuide) {
    return {};
  }

  return {
    link: [{ rel: "canonical", href: canonicalUrl.value }],
    meta: [
      {
        name: "keywords",
        content: currentGuide.keywords.join(", "),
      },
    ],
    script: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: currentGuide.title,
              description: currentGuide.metaDescription,
              url: canonicalUrl.value,
              mainEntityOfPage: canonicalUrl.value,
              publisher: {
                "@type": "Organization",
                name: "ChlatWork",
                url: siteUrl,
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: currentGuide.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ],
        }),
      },
    ],
  };
});
</script>

<template>
  <main
    v-if="guide"
    class="mx-auto w-full max-w-[920px] space-y-8 text-slate-950 dark:text-white"
  >
    <header class="space-y-4">
      <NuxtLink
        to="/guides"
        class="inline-flex text-sm font-bold text-sky-700 hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-100"
      >
        All guides
      </NuxtLink>
      <div class="space-y-3">
        <p class="text-xs font-bold uppercase text-sky-700 dark:text-cyan-300">
          ChlatWork Guide
        </p>
        <h1 class="text-3xl font-black leading-tight sm:text-5xl">
          {{ guide.title }}
        </h1>
        <p class="text-base leading-7 text-slate-600 dark:text-white/65">
          {{ guide.summary }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <NuxtLink
          :to="guide.primaryTool.path"
          class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-sky-700 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
        >
          Open {{ guide.primaryTool.label }}
        </NuxtLink>
        <NuxtLink
          to="/tools"
          class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:border-cyan-300/40 dark:hover:text-cyan-200"
        >
          Browse tools
        </NuxtLink>
      </div>
    </header>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-2xl font-black">Steps</h2>
      <ol class="mt-4 space-y-3">
        <li
          v-for="(step, index) in guide.steps"
          :key="step"
          class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white dark:bg-white dark:text-slate-950"
          >
            {{ index + 1 }}
          </span>
          <span class="pt-0.5">{{ step }}</span>
        </li>
      </ol>
    </section>

    <article class="space-y-8">
      <section
        v-for="section in guide.sections"
        :key="section.heading"
        class="space-y-3"
      >
        <h2 class="text-2xl font-black">{{ section.heading }}</h2>
        <p
          v-for="paragraph in section.paragraphs"
          :key="paragraph"
          class="text-sm leading-7 text-slate-600 dark:text-white/65"
        >
          {{ paragraph }}
        </p>
        <ul
          v-if="section.bullets?.length"
          class="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600 dark:text-white/65"
        >
          <li v-for="bullet in section.bullets" :key="bullet">
            {{ bullet }}
          </li>
        </ul>
      </section>
    </article>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-2xl font-black">Examples</h2>
      <ul class="mt-4 space-y-3">
        <li
          v-for="example in guide.examples"
          :key="example"
          class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
        >
          <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
          <span>{{ example }}</span>
        </li>
      </ul>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
    >
      <h2 class="text-2xl font-black">FAQ</h2>
      <div class="mt-4 space-y-3">
        <details
          v-for="faq in guide.faqs"
          :key="faq.question"
          class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.05]"
        >
          <summary class="cursor-pointer text-sm font-bold">
            {{ faq.question }}
          </summary>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            {{ faq.answer }}
          </p>
        </details>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-2xl font-black">Related tools</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="tool in guide.relatedTools"
          :key="tool.path"
          :to="tool.path"
          class="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:bg-white/[0.10] dark:hover:text-cyan-200"
        >
          {{ tool.label }}
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
