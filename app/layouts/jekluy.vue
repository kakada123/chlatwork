<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();

const { config, product: domainProduct } = useProductDomain();
</script>

<template>
  <div class="jekluy-shell min-h-[calc(100dvh-var(--product-header-height,0px))] bg-[#f4f8fb] text-[#102a43] dark:bg-[#0b1524] dark:text-slate-100" :lang="isKhmer ? 'km' : 'en'">
    <a href="#jekluy-content" class="sr-only z-50 rounded-lg bg-white p-3 text-slate-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">{{ t("native.jekluy.skipToTheCalculator") }}</a>
    <LayoutProductNavigation v-if="!domainProduct" product="jekluy" />
    <section class="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-10">
      <div>
        <h1 class="text-2xl font-bold leading-relaxed tracking-normal sm:text-3xl">{{ t("native.jekluy.jekluy") }}</h1>
        <p class="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">{{ t("native.jekluy.easilyCalculateWhoOwesWhom") }}</p>
      </div>
    </section>
    <main id="jekluy-content" class="mx-auto max-w-5xl px-4 outline-none sm:px-6" tabindex="-1">
      <slot />
    </main>
    <footer class="mx-auto max-w-5xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-7 text-center text-xs leading-7 text-slate-500 dark:text-slate-400 sm:px-6">
      <p>{{ t("native.jekluy.dataStaysOnThisDeviceNoSignInRequired") }}</p>
      <a :href="config.mainOrigin" class="inline-flex min-h-11 items-center font-semibold text-blue-700 underline-offset-4 hover:underline dark:text-blue-300">{{ t("native.jekluy.chlatworkApps") }}</a>
    </footer>
  </div>
</template>

<style scoped>
.jekluy-shell {
  --app-font: var(--content-khmer-font), "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-family: var(--app-font);
  letter-spacing: 0;
  line-height: 1.8;
}
.jekluy-shell :deep(button:focus-visible),
.jekluy-shell :deep(a:focus-visible),
.jekluy-shell :deep(summary:focus-visible) {
  outline: 2px solid #2563eb;
  outline-offset: 3px;
}
@media (prefers-reduced-motion: reduce) {
  .jekluy-shell :deep(*) { scroll-behavior: auto; }
}
</style>
