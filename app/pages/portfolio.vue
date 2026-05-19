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
    class="overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.20),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(217,70,239,0.14),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef7ff_44%,#fff7fe_100%)] text-slate-950 dark:bg-[linear-gradient(180deg,#020712_0%,#07111f_42%,#020712_100%)] dark:text-white"
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
