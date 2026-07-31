<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import ToolContentLayout from "~/components/tools/ToolContentLayout.vue";
import { EDITORIAL_AUTHOR } from "~/data/editorial-identity";

const props = defineProps<{
  guide: ToolGuide;
}>();

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
  <ToolContentLayout :guide="guide" />
</template>
