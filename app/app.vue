<template>
  <Analytics />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieConsent />
</template>

<script setup lang="ts">
import { Analytics } from "@vercel/analytics/nuxt";

const { copy, locale } = useLanguage();
const { isDark } = useColorMode();
const route = useRoute();
const siteUrl = "https://chlatwork.com";
const ogImage = `${siteUrl}/og-home.png`;
const localizedTitle = computed(() => copy.value.metaTitle);
const localizedDescription = computed(() => copy.value.metaDescription);
const themeColor = computed(() => (isDark.value ? "#1c1c1e" : "#f9fafb"));
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
});

useHead(() => ({
  htmlAttrs: {
    lang: locale.value,
    class: isDark.value ? "dark" : "",
    style: `color-scheme: ${isDark.value ? "dark" : "light"};`,
    "data-locale": locale.value,
    "data-theme": isDark.value ? "dark" : "light",
  },
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
    },
    ...(route.path === "/" || route.path === "/km"
      ? [
          {
            rel: "alternate",
            hreflang: "en",
            href: siteUrl,
          },
          {
            rel: "alternate",
            hreflang: "km",
            href: `${siteUrl}/km`,
          },
        ]
      : []),
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
        "@type": "Organization",
        name: "ChlatWork",
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
      }),
    },
  ],
}));
</script>
