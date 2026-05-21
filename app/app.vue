<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieConsent />
</template>

<script setup lang="ts">
const { copy, isKhmer, locale } = useLanguage();
const { isDark } = useColorMode();
const siteUrl = "https://chlatwork.com";
const ogImage = `${siteUrl}/og-home.png`;
const localizedTitle = computed(() => copy.value.metaTitle);
const localizedDescription = computed(() => copy.value.metaDescription);
const themeColor = computed(() => (isDark.value ? "#1c1c1e" : "#f9fafb"));

useSeoMeta({
  title: localizedTitle,
  description: localizedDescription,

  ogTitle: localizedTitle,
  ogDescription: localizedDescription,
  ogImage,
  ogUrl: siteUrl,
  ogType: "website",

  twitterCard: "summary_large_image",
  twitterTitle: localizedTitle,
  twitterDescription: localizedDescription,
  twitterImage: ogImage,
});

useHead({
  htmlAttrs: {
    lang: locale,
    class: computed(() => (isDark.value ? "dark" : "")),
    style: computed(() => `color-scheme: ${isDark.value ? "dark" : "light"};`),
    "data-locale": locale,
    "data-theme": computed(() => (isDark.value ? "dark" : "light")),
  },
  link: [
    {
      rel: "canonical",
      href: computed(() => (isKhmer.value ? `${siteUrl}/km` : siteUrl)),
    },
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
  ],
  meta: [
    {
      name: "theme-color",
      content: themeColor,
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
