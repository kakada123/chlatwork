<script setup lang="ts">import { computed } from "vue";

import { useLanguage } from "~/composables/useLanguage";
import { useAppI18n } from "~/composables/useAppI18n";
import { Moon, Sun, Utensils, Compass, ArrowLeft } from "lucide-vue-next";
import { useColorMode } from "~/composables/useColorMode";
import { useProductDomain } from "~/composables/useProductDomain";
const { t } = useAppI18n();
const { languageLabel, switchLanguage } = useLanguage();

const { isDark, toggleColorMode } = useColorMode();
const { config, canonical } = useProductDomain();
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
  <div class="food-shell min-h-dvh bg-[#fafaf9] text-stone-900 transition-colors duration-200 dark:bg-[#0c0f14] dark:text-stone-100" lang="km">
    <a href="#food-content" class="sr-only z-50 rounded-lg bg-white p-3 text-stone-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
      {{ t("products.food.shell.skip") }}
    </a>

    <!-- Top Navigation Header -->
    <header class="sticky top-0 z-40 border-b border-stone-200/80 bg-white/80 backdrop-blur-md dark:border-stone-800/80 dark:bg-[#0c0f14]/85">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
            <Utensils class="size-5" aria-hidden="true" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-lg font-bold leading-none sm:text-xl text-stone-900 dark:text-stone-100">
                ChlatWork Food
              </h1>
              <span class="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                {{ t("products.food.shell.free") }}
              </span>
            </div>
            <p class="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              {{ t("products.food.page.title") }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button" class="min-h-10 rounded-full border border-stone-200 px-3 text-xs font-semibold dark:border-stone-800" :aria-label="languageLabel" @click="switchLanguage">{{ languageLabel }}</button>
          <a
            :href="config.mainOrigin"
            class="hidden items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-800 sm:inline-flex"
            :title="t(&quot;products.food.shell.home_title&quot;)"
          >
            <ArrowLeft class="size-3.5" aria-hidden="true" />
            <span>{{ t("products.food.shell.brand") }}</span>
          </a>

          <button
            type="button"
            class="grid size-10 place-items-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:border-orange-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-orange-500"
            :aria-label="isDark ? t(&quot;products.food.shell.switch_light&quot;) : t(&quot;products.food.shell.switch_dark&quot;)"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-4.5" aria-hidden="true" />
            <Moon v-else class="size-4.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

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
  --app-font: "Hanuman", "Helvetica Neue", Helvetica, Arial, sans-serif;
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
