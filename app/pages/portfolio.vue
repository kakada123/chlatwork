<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { getPortfolioCopy } from "~/data/portfolio-km";
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

const { t } = useAppI18n();

const { locale, isKhmer } = useLanguage();
const portfolioCopy = computed(() => getPortfolioCopy(locale.value));
const pageEl = ref<HTMLElement | null>(null);
const siteUrl = "https://chlatwork.com";
const pageTitle = computed(() => t("shared.pages_portfolio.kakada_ngen_backend_full_stack_developer"));
const pageDescription = computed(() => t("shared.pages_portfolio.portfolio_for_kakada_ngen_a_backend_focused_full_stack"));
const pageUrl = `${siteUrl}/portfolio`;
const ogImage = `${siteUrl}/og-home.png?v=20261104`;

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
    <PortfolioHero :profile="portfolioCopy.profile" :metrics="portfolioCopy.metrics" />
    <PortfolioAbout
      :paragraphs="portfolioCopy.about"
      :highlights="portfolioCopy.highlights"
    />
    <PortfolioSkills :groups="portfolioCopy.skills" />
    <PortfolioProjects :projects="portfolioCopy.projects" />
    <PortfolioWorkingStyle :items="portfolioCopy.workingStyle" />
    <PortfolioContact :links="portfolioCopy.contacts" />
  </main>
</template>
