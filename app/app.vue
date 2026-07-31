<template>
  <Analytics />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieConsent />
</template>

<script setup lang="ts">
import { Analytics } from "@vercel/analytics/nuxt";
import {
  ADSENSE_ELIGIBLE_PATHS,
  PUBLIC_SITEMAP_PATHS,
} from "~/data/site-routes";

const { copy, isKhmer } = useLanguage();
const { isDark } = useColorMode();
const route = useRoute();
const siteUrl = "https://chlatwork.com";
const ogImage = `${siteUrl}/og-home.png`;
const localizedTitle = computed(() => copy.value.metaTitle);
const localizedDescription = computed(() => copy.value.metaDescription);
const htmlLocale = computed(() => (isKhmer.value ? "km" : "en"));
const themeColor = computed(() => (isDark.value ? "#1c1c1e" : "#f9fafb"));
const indexablePaths = new Set(PUBLIC_SITEMAP_PATHS);
const adsenseEligiblePaths = new Set(ADSENSE_ELIGIBLE_PATHS);
const normalizedPath = computed(() =>
  route.path === "/" ? "/" : route.path.replace(/\/$/, ""),
);
const robotsContent = computed(() =>
  indexablePaths.has(normalizedPath.value) ? "index, follow" : "noindex, follow",
);
const canonicalUrl = computed(() => {
  const path = route.path === "/" ? "" : route.path.replace(/\/$/, "");

  return `${siteUrl}${path}`;
});

useSeoMeta({
  title: localizedTitle,
  description: localizedDescription,

  ogTitle: localizedTitle,
  ogDescription: localizedDescription,
  ogImage,
  ogUrl: canonicalUrl,
  ogType: "website",

  twitterCard: "summary_large_image",
  twitterTitle: localizedTitle,
  twitterDescription: localizedDescription,
  twitterImage: ogImage,
  robots: robotsContent,
});

useHead(() => ({
  htmlAttrs: {
    lang: htmlLocale.value,
    class: isDark.value ? "dark" : "",
    style: `color-scheme: ${isDark.value ? "dark" : "light"};`,
    "data-locale": htmlLocale.value,
    "data-theme": isDark.value ? "dark" : "light",
  },
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
    },
  ],
  meta: [
    {
      name: "theme-color",
      content: themeColor.value,
    },
  ],
  script: [
    {
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${siteUrl}#organization`,
            name: "ChlatWork",
            url: siteUrl,
            logo: `${siteUrl}/logo.png`,
          },
          {
            "@type": "WebSite",
            "@id": `${siteUrl}#website`,
            name: "ChlatWork",
            url: siteUrl,
            publisher: {
              "@id": `${siteUrl}#organization`,
            },
            description:
              "ChlatWork provides simple online tools for documents, images, QR codes, barcodes, dates, and productivity.",
          },
        ],
      }),
    },
    ...(adsenseEligiblePaths.has(normalizedPath.value)
      ? [
          {
            key: "adsense",
            async: true,
            src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3732801458368248",
            crossorigin: "anonymous",
          },
        ]
      : []),
  ],
}));
</script>
