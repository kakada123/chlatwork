<template>
  <Analytics />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Analytics } from "@vercel/analytics/nuxt";

const siteUrl = "https://chlatwork.com";
const ogImage = `${siteUrl}/og-home.png`;

useSeoMeta({
  title: "ChlatWork - Simple tools that get things done",
  description:
    "Fast, clean, and practical tools for daily work, developers, and creators.",

  ogTitle: "ChlatWork - Simple tools that get things done",
  ogDescription:
    "Fast, clean, and practical tools for daily work, developers, and creators.",
  ogImage,
  ogUrl: siteUrl,
  ogType: "website",

  twitterCard: "summary_large_image",
  twitterTitle: "ChlatWork - Simple tools that get things done",
  twitterDescription:
    "Fast, clean, and practical tools for daily work, developers, and creators.",
  twitterImage: ogImage,
});

useHead({
  link: [
    {
      rel: "canonical",
      href: siteUrl,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "ChlatWork",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      }),
    },
  ],
});
</script>
