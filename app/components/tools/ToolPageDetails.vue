<script setup lang="ts">
import type { ToolGuide } from "~/data/tool-guides";
import ToolContentLayout from "~/components/tools/ToolContentLayout.vue";

const props = defineProps<{
  guide: ToolGuide;
}>();

const siteUrl = "https://chlatwork.com";
const canonicalUrl = computed(() => `${siteUrl}${props.guide.tool.route}`);
const faqs = computed(() => props.guide.faqs.slice(0, 6));

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
  <ToolContentLayout :guide="guide" />
</template>
