<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import ToolContentLayout from "~/components/tools/ToolContentLayout.vue";
import { EDITORIAL_AUTHOR } from "~/data/editorial-identity";

const props = withDefaults(
  defineProps<{
    guide: ToolGuide;
    showRelated?: boolean;
  }>(),
  {
    showRelated: true,
  },
);

const siteUrl = "https://chlatwork.com";
const canonicalUrl = computed(() => `${siteUrl}${props.guide.tool.route}`);
const faqs = computed(() => props.guide.faqs.slice(0, 6));
const reviewDate = "2026-07-31";
const editorialAuthor = {
  "@type": "Person",
  name: EDITORIAL_AUTHOR.name,
  url: `${siteUrl}${EDITORIAL_AUTHOR.profilePath}`,
};

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
            author: editorialAuthor,
            publisher: {
              "@type": "Organization",
              name: "ChlatWork",
              url: siteUrl,
            },
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          },
          {
            "@type": "WebPage",
            name: props.guide.heroTitle,
            url: canonicalUrl.value,
            description: props.guide.metaDescription,
            dateModified: reviewDate,
            author: editorialAuthor,
            isPartOf: {
              "@type": "WebSite",
              name: "ChlatWork",
              url: siteUrl,
            },
            publisher: {
              "@type": "Organization",
              name: "ChlatWork",
              url: siteUrl,
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
  <details
    class="group mx-auto mt-8 w-full max-w-[1180px] overflow-hidden rounded-2xl border border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]"
  >
    <summary
      class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 dark:text-white/75 dark:hover:bg-white/[0.05] [&::-webkit-details-marker]:hidden sm:px-5"
    >
      <span class="min-w-0 flex-1">About {{ guide.tool.name }}</span>
      <span
        aria-hidden="true"
        class="relative grid size-7 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 dark:border-white/10 dark:text-white/60"
      >
        <span class="absolute h-px w-3 bg-current" />
        <span class="absolute h-3 w-px bg-current transition-opacity group-open:opacity-0" />
      </span>
    </summary>
    <div class="border-t border-slate-200 px-3 pb-5 dark:border-white/10 sm:px-5">
      <ToolContentLayout :guide="guide" :show-related="showRelated" />
    </div>
  </details>
</template>
