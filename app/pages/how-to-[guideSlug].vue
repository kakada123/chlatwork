<script setup lang="ts">
import { findToolGuideByPath } from "~/data/tool-guides";

const route = useRoute();
const pageEl = ref<HTMLElement | null>(null);
const siteUrl = "https://chlatwork.com";
const guide = computed(() => findToolGuideByPath(route.path));
const pageUrl = computed(() =>
  guide.value ? `${siteUrl}${guide.value.path}` : siteUrl,
);

useLandingReveal(pageEl);

watchEffect(() => {
  if (!guide.value) {
    throw createError({
      statusCode: 404,
      statusMessage: "Tool guide not found",
    });
  }
});

useSeoMeta({
  title: computed(() => guide.value?.metaTitle ?? "Tool Guide - ChlatWork"),
  description: computed(() => guide.value?.metaDescription ?? ""),
  ogTitle: computed(() => guide.value?.metaTitle ?? "Tool Guide - ChlatWork"),
  ogDescription: computed(() => guide.value?.metaDescription ?? ""),
  ogType: "article",
  ogUrl: pageUrl,
  ogImage: `${siteUrl}/og-home.png`,
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => guide.value?.metaTitle ?? "Tool Guide - ChlatWork"),
  twitterDescription: computed(() => guide.value?.metaDescription ?? ""),
  twitterImage: `${siteUrl}/og-home.png`,
});

useHead(() => {
  const currentGuide = guide.value;

  if (!currentGuide) {
    return {};
  }

  const canonicalUrl = `${siteUrl}${currentGuide.path}`;
  const toolUrl = `${siteUrl}${currentGuide.tool.route}`;
  const softwareId = `${canonicalUrl}#software`;

  return {
    link: [{ rel: "canonical", href: canonicalUrl }],
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
              "@type": "WebPage",
              "@id": canonicalUrl,
              name: currentGuide.metaTitle,
              description: currentGuide.metaDescription,
              url: canonicalUrl,
              isPartOf: {
                "@type": "WebSite",
                name: "ChlatWork",
                url: siteUrl,
              },
              about: {
                "@id": softwareId,
              },
            },
            {
              "@type": "FAQPage",
              "@id": `${canonicalUrl}#faq`,
              mainEntity: currentGuide.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
            {
              "@type": "SoftwareApplication",
              "@id": softwareId,
              name: currentGuide.tool.name,
              applicationCategory: currentGuide.applicationCategory,
              operatingSystem: "Any",
              url: toolUrl,
              description: currentGuide.tool.description,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
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
    ref="pageEl"
    class="mx-auto w-full max-w-[1120px] space-y-8"
  >
    <header
      class="overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-xl shadow-sky-100/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20"
      data-reveal
    >
      <div
        class="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8"
      >
        <div class="space-y-5">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200"
          >
            <span
              class="h-2 w-2 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            ChlatWork Guide
          </div>

          <div class="space-y-3">
            <h1
              class="max-w-3xl text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl"
            >
              {{ guide.heroTitle }}
            </h1>
            <p
              class="max-w-2xl text-base leading-7 text-slate-600 dark:text-white/70"
            >
              {{ guide.heroDescription }}
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <NuxtLink
              :to="guide.tool.route"
              class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-300/60 transition hover:-translate-y-0.5 hover:bg-sky-700 dark:bg-white dark:text-slate-950 dark:shadow-black/20 dark:hover:bg-cyan-100"
            >
              {{ guide.ctaLabel }}
            </NuxtLink>
            <NuxtLink
              to="/tools"
              class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white/75 px-5 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/75 dark:hover:border-cyan-300/40 dark:hover:text-cyan-200"
            >
              Browse all tools
            </NuxtLink>
          </div>
        </div>

        <aside
          class="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/40"
        >
          <div class="space-y-4">
            <span
              class="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              :class="guide.iconClass"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in guide.iconPaths"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>
            <div>
              <p class="text-xs font-semibold uppercase text-slate-400">
                Tool
              </p>
              <p class="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {{ guide.tool.name }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/60">
                {{ guide.tool.description }}
              </p>
            </div>
          </div>
          <NuxtLink
            :to="guide.tool.route"
            class="mt-6 text-sm font-bold text-sky-700 transition hover:text-sky-900 dark:text-cyan-300 dark:hover:text-cyan-100"
          >
            Open the tool
          </NuxtLink>
        </aside>
      </div>
    </header>

    <section
      class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
      data-reveal
    >
      <article
        class="space-y-8 rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-lg shadow-sky-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 sm:p-7"
      >
        <section class="space-y-3">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            What is this tool?
          </h2>
          <p
            v-for="paragraph in guide.whatIs"
            :key="paragraph"
            class="text-sm leading-7 text-slate-600 dark:text-white/70"
          >
            {{ paragraph }}
          </p>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            Why use this tool?
          </h2>
          <ul class="grid gap-3 sm:grid-cols-2">
            <li
              v-for="reason in guide.whyUse"
              :key="reason"
              class="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm leading-6 text-slate-600 dark:border-white/10 dark:bg-slate-950/35 dark:text-white/70"
            >
              {{ reason }}
            </li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            How to use it
          </h2>
          <ol class="space-y-3">
            <li
              v-for="(step, index) in guide.steps"
              :key="step"
              class="flex gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white dark:bg-white dark:text-slate-950"
              >
                {{ index + 1 }}
              </span>
              <p class="pt-1 text-sm leading-6 text-slate-600 dark:text-white/70">
                {{ step }}
              </p>
            </li>
          </ol>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            Common use cases
          </h2>
          <ul class="space-y-3">
            <li
              v-for="useCase in guide.useCases"
              :key="useCase"
              class="flex gap-3 text-sm leading-7 text-slate-600 dark:text-white/70"
            >
              <span
                class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-400"
                aria-hidden="true"
              />
              <span>{{ useCase }}</span>
            </li>
          </ul>
        </section>

        <section class="space-y-3">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            Tips and best practices
          </h2>
          <ul class="grid gap-3 sm:grid-cols-2">
            <li
              v-for="tip in guide.tips"
              :key="tip"
              class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-6 text-emerald-950 dark:border-emerald-300/15 dark:bg-emerald-300/10 dark:text-emerald-50"
            >
              {{ tip }}
            </li>
          </ul>
        </section>

        <section class="space-y-3" id="faq">
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            FAQ
          </h2>
          <div class="space-y-3">
            <details
              v-for="faq in guide.faqs"
              :key="faq.question"
              class="group rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/35"
            >
              <summary
                class="cursor-pointer list-none text-sm font-bold text-slate-950 dark:text-white"
              >
                {{ faq.question }}
              </summary>
              <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-white/70">
                {{ faq.answer }}
              </p>
            </details>
          </div>
        </section>
      </article>

      <aside class="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div
          class="rounded-[24px] border border-white/80 bg-white/80 p-5 shadow-lg shadow-sky-100/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
        >
          <p class="text-xs font-semibold uppercase text-slate-400">
            Quick action
          </p>
          <h2 class="mt-2 text-xl font-black text-slate-950 dark:text-white">
            Ready to try it?
          </h2>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-white/65">
            Open the real tool and follow the guide while you work.
          </p>
          <NuxtLink
            :to="guide.tool.route"
            class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-sky-600 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-700 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200"
          >
            {{ guide.ctaLabel }}
          </NuxtLink>
        </div>

        <div
          class="rounded-[24px] border border-white/80 bg-white/70 p-5 text-sm leading-6 text-slate-600 shadow-lg shadow-sky-100/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05] dark:text-white/65 dark:shadow-black/20"
        >
          <p class="font-bold text-slate-950 dark:text-white">
            Good to know
          </p>
          <p class="mt-2">
            Most ChlatWork tools are built for quick browser use, so you can
            finish the task without installing another app.
          </p>
        </div>
      </aside>
    </section>

    <section
      class="rounded-[24px] border border-sky-100 bg-sky-50/80 p-5 text-center shadow-lg shadow-sky-100/70 dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:shadow-black/20 sm:p-7"
      data-reveal
    >
      <h2 class="text-2xl font-black text-slate-950 dark:text-white">
        Use the {{ guide.tool.name }} now
      </h2>
      <p class="mx-auto mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-white/70">
        This guide explains the workflow. The tool page is where you can create,
        convert, calculate, test, or download the actual result.
      </p>
      <NuxtLink
        :to="guide.tool.route"
        class="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sky-700 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
      >
        {{ guide.ctaLabel }}
      </NuxtLink>
    </section>
  </main>
</template>
