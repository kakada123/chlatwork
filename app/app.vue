<template>
  <Analytics />
  <div
    :class="canShowAds ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_160px] lg:gap-4 lg:pr-4' : undefined"
  >
    <div class="min-w-0">
      <AdsBannerAd v-if="canShowAds" :key="route.path" />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <!-- Leave room below the ad for the fixed mobile navigation. -->
      <div
        v-if="canShowAds"
        class="pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-0"
      >
        <AdsBannerAd :key="route.path" placement="footer" />
      </div>
    </div>
    <AdsDesktopAd v-if="canShowAds" :key="route.path" />
  </div>
  <CookieConsent />
</template>

<script setup lang="ts">
import { Analytics } from "@vercel/analytics/nuxt";
import { getPublisherRobots } from "~/data/site-routes";

const { copy, isKhmer } = useLanguage();
useColorMode();
const route = useRoute();
const { canShowAds } = useAdVisibility();

onMounted(() => {
  watch(canShowAds, (allowed, previouslyAllowed) => {
    // Signing in as Kakada also clears ads already injected by third-party scripts.
    if (previouslyAllowed && !allowed) window.location.reload();
  });
});

const siteUrl = "https://chlatwork.com";
const ogImage = `${siteUrl}/og-home.png`;
const localizedTitle = computed(() => copy.value.metaTitle);
const localizedDescription = computed(() => copy.value.metaDescription);
const htmlLocale = computed(() => (isKhmer.value ? "km" : "en"));
const normalizedPath = computed(() =>
  route.path === "/" ? "/" : route.path.replace(/\/$/, ""),
);
const robotsContent = computed(() => getPublisherRobots(normalizedPath.value));
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
    "data-locale": htmlLocale.value,
  },
  link: [
    {
      rel: "canonical",
      href: canonicalUrl.value,
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
  ],
}));
</script>
