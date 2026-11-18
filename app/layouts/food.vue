<script setup lang="ts">import { computed } from "vue";

import { useAppI18n } from "~/composables/useAppI18n";
import { useProductDomain } from "~/composables/useProductDomain";
const { t } = useAppI18n();

const { config, canonical, product: domainProduct } = useProductDomain();
const foodTitle = computed(() => (t("products.food.shell.meta_title")));
const foodDescription = computed(() => (t("products.food.shell.meta_description")));
// Share crawlers need an absolute, server-rendered image URL on either supported Food URL.
const shareImage = computed(() => new URL("/images/food/khmer-food-background-v1.jpg", canonical.value).href);
const shareImageAlt = computed(() => t("products.food.shell.share_image_alt"));

useSeoMeta({
  title: foodTitle,
  description: foodDescription,
  ogTitle: foodTitle,
  ogDescription: foodDescription,
  ogType: "website",
  ogSiteName: "ChlatWork Food",
  ogUrl: canonical,
  ogImage: shareImage,
  ogImageWidth: 1600,
  ogImageHeight: 900,
  ogImageType: "image/jpeg",
  ogImageAlt: shareImageAlt,
  twitterCard: "summary_large_image",
  twitterTitle: foodTitle,
  twitterDescription: foodDescription,
  twitterImage: shareImage,
  twitterImageAlt: shareImageAlt,
});

useHead({
  meta: [
    { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
  ],
});
</script>

<template>
  <div class="food-shell min-h-[calc(100dvh-var(--product-header-height,0px))] bg-[#fafaf9] text-stone-900 transition-colors duration-200 dark:bg-[#0c0f14] dark:text-stone-100" lang="km">
    <a href="#food-content" class="sr-only z-50 rounded-lg bg-white p-3 text-stone-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      {{ t("products.food.shell.skip") }}
    </a>

    <LayoutProductNavigation v-if="!domainProduct" product="food" />

    <!-- Main Content Area -->
    <main id="food-content" class="mx-auto max-w-5xl px-4 py-6 outline-none sm:px-6 sm:py-8" tabindex="-1">
      <slot />
    </main>

    <!-- Keep provider attribution and price limitations visible near discovery results. -->
    <footer class="mt-12 border-t border-stone-200 bg-white/50 px-4 py-8 text-center text-xs leading-6 text-stone-500 dark:border-stone-800 dark:bg-stone-950/50 dark:text-stone-400 sm:px-6">
      <div class="mx-auto max-w-5xl space-y-2">
        <p>
          {{ t("products.food.shell.attribution") }}
          <a
            href="https://maps.google.com"
            target="_blank"
            rel="noopener noreferrer"
            class="font-normal text-orange-600 underline underline-offset-4 hover:text-orange-700 dark:text-orange-400"
            translate="no"
          >
            Google Maps
          </a>
        </p>
        <p class="text-[11px] text-stone-400 dark:text-stone-500">
          {{ t("products.food.shell.notice") }}
        </p>
        <div class="pt-2">
          <a
            :href="config.mainOrigin"
            class="inline-flex items-center gap-1 font-semibold text-stone-700 underline-offset-4 hover:underline dark:text-stone-300"
          >
            <span>{{ t("products.food.shell.all_apps") }}</span>
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.food-shell {
  position: relative;
  isolation: isolate;
  --food-background-image: url("/images/food/khmer-food-background-v1.jpg");
  --food-background-wash: rgb(250 250 249 / 86%);
  --app-font: var(--content-khmer-font), "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-family: var(--app-font);
  letter-spacing: 0;
  line-height: 1.7;
}

/* Keep the decorative image behind the page without affecting scrolling or pointer targets. */
.food-shell::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: linear-gradient(var(--food-background-wash), var(--food-background-wash)), var(--food-background-image);
  background-size: cover;
  background-position: center right;
}

.dark .food-shell {
  --food-background-wash: rgb(12 15 20 / 94%);
}

@media (max-width: 639px) {
  .food-shell {
    --food-background-image: url("/images/food/khmer-food-background-mobile-v1.jpg");
  }
}

.food-shell :deep(button:focus-visible),
.food-shell :deep(a:focus-visible),
.food-shell :deep(input:focus-visible),
.food-shell :deep(select:focus-visible) {
  outline: 2px solid #ea580c;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .food-shell :deep(*) {
    scroll-behavior: auto;
  }
}
</style>
