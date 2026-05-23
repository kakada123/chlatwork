<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import { getRelatedToolsForToolKey } from "~/data/tool-categories";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const props = defineProps<{
  guide: ToolGuide;
}>();

const siteUrl = "https://chlatwork.com";
const canonicalUrl = computed(() => `${siteUrl}${props.guide.tool.route}`);
const steps = computed(() => props.guide.steps.slice(0, 5));
const useCases = computed(() => props.guide.useCases.slice(0, 4));
const faqs = computed(() => props.guide.faqs.slice(0, 5));
const relatedTools = computed(() =>
  getRelatedToolsForToolKey(props.guide.tool.key, 4),
);

useHead(() => ({
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareApplication",
            name: props.guide.tool.name,
            applicationCategory: props.guide.applicationCategory,
            operatingSystem: "Any",
            url: canonicalUrl.value,
            description: props.guide.tool.description,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          },
          {
            "@type": "FAQPage",
            mainEntity: faqs.value.map((faq) => ({
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
}));
</script>

<template>
  <section
    class="mx-auto mt-8 w-full max-w-[1180px] space-y-6 text-slate-950 dark:text-white"
    aria-label="Tool details"
  >
    <div
      class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
    >
      <p class="font-black">Privacy note</p>
      <p class="mt-1 text-emerald-800/85 dark:text-emerald-100/80">
        {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
      </p>
    </div>

    <section class="grid gap-4 lg:grid-cols-2">
      <article
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-lg font-black">How to use {{ guide.tool.name }}</h2>
        <ol class="mt-4 space-y-3">
          <li
            v-for="(step, index) in steps"
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
      </article>

      <article
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      >
        <h2 class="text-lg font-black">Example use cases</h2>
        <ul class="mt-4 space-y-3">
          <li
            v-for="useCase in useCases"
            :key="useCase"
            class="flex gap-3 text-sm leading-6 text-slate-600 dark:text-white/65"
          >
            <span
              class="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500"
              aria-hidden="true"
            />
            <span>{{ useCase }}</span>
          </li>
        </ul>
      </article>
    </section>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
      id="faq"
    >
      <h2 class="text-lg font-black">FAQ</h2>
      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <details
          v-for="faq in faqs"
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
      <h2 class="text-lg font-black">Related tools</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="tool in relatedTools"
          :key="tool.key"
          :to="tool.route"
          class="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.10]"
        >
          <h3 class="text-sm font-black">{{ tool.name }}</h3>
          <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-white/55">
            {{ tool.description }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </section>
</template>
