<template>
  <Analytics />
  <div
    :class="canShowAds ? 'flex flex-col lg:grid lg:grid-cols-[160px_minmax(0,1fr)_160px] lg:gap-4 lg:px-4' : undefined"
  >
    <div class="min-w-0 lg:order-2">
      <AdsBannerAd v-if="canShowAds" :key="route.path" />
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
    <!-- Reuse the 160×300 footer ad on the left at desktop sizes on every route. -->
    <aside
      v-if="canShowAds"
      class="pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-0 lg:order-1"
      :aria-label="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
    >
      <div class="lg:sticky lg:top-3">
        <AdsBannerAd :key="route.path" placement="footer" />
      </div>
    </aside>
    <AdsDesktopAd v-if="canShowAds" :key="route.path" class="lg:order-3" />
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
