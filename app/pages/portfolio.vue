<script setup lang="ts">
import {
  portfolioAbout,
  portfolioContacts,
  portfolioHighlights,
  portfolioMetrics,
  portfolioProfile,
  portfolioProjects,
  portfolioSkills,
  portfolioWorkingStyle,
} from "~/data/portfolio";

const pageEl = ref<HTMLElement | null>(null);
const siteUrl = "https://chlatwork.com";
const pageTitle = "Kakada Ngen - Backend & Full-Stack Developer";
const pageDescription =
  "Portfolio for Kakada Ngen, a backend-focused full-stack developer building POS systems, APIs, dashboards, microservices, Electron apps, and automation tools.";
const pageUrl = `${siteUrl}/portfolio`;
const ogImage = `${siteUrl}/og-home.png`;

useLandingReveal(pageEl);

useSeoMeta({
  title: pageTitle,
  description: pageDescription,
  ogTitle: pageTitle,
  ogDescription: pageDescription,
  ogImage,
  ogUrl: pageUrl,
  ogType: "profile",
  twitterCard: "summary_large_image",
  twitterTitle: pageTitle,
  twitterDescription: pageDescription,
  twitterImage: ogImage,
});

useHead({
  link: [
    {
      rel: "canonical",
      href: pageUrl,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        name: portfolioProfile.name,
        jobTitle: portfolioProfile.title,
        url: pageUrl,
        sameAs: portfolioContacts
          .filter((contact) => contact.href.startsWith("https://"))
          .map((contact) => contact.href),
        knowsAbout: [
          "NestJS",
          "Laravel",
          "Vue.js",
          "Nuxt",
          "Electron",
          "POS systems",
          "Microservices",
          "Socket.IO",
          "Receipt printing",
          "Business automation",
        ],
      }),
    },
  ],
});
</script>

<template>
  <main
    ref="pageEl"
    class="overflow-hidden text-slate-950 dark:text-white"
  >
    <PortfolioHero :profile="portfolioProfile" :metrics="portfolioMetrics" />
    <PortfolioAbout
      :paragraphs="portfolioAbout"
      :highlights="portfolioHighlights"
    />
    <PortfolioSkills :groups="portfolioSkills" />
    <PortfolioProjects :projects="portfolioProjects" />
    <PortfolioWorkingStyle :items="portfolioWorkingStyle" />
    <PortfolioContact :links="portfolioContacts" />
  </main>
</template>
