<script setup lang="ts">
import { ref } from "vue";
import { ChevronDown } from "lucide-vue-next";
import { useAppI18n } from "~/composables/useAppI18n";
import { PRODUCTS, type Product } from "~/lib/product-domains";
const { destination } = useProductDomain();
const { t } = useAppI18n();
const mobileExpanded = ref(false);
const { websiteEnabled } = useFeatureAvailability();
const featureKeys: Partial<Record<Product, string>> = { link: "chlatwork-link", expense: "expense-tracker", draw: "lucky-draw", games: "kla-klok" };
const products = computed(() => Object.entries(PRODUCTS).filter(([key]) => !featureKeys[key as Product] || websiteEnabled(featureKeys[key as Product]!)));
</script>

<template>
  <section class="mt-2 mb-8 w-full sm:mb-10" aria-labelledby="product-directory-title">
    <h2
      id="product-directory-title"
      class="mb-4 text-lg font-semibold tracking-tight text-[#082552] dark:text-white sm:text-xl"
    >
      <button
        type="button"
        class="flex min-h-11 w-full items-center justify-between gap-3 text-left sm:hidden"
        :aria-expanded="mobileExpanded"
        aria-controls="product-directory-links"
        :aria-label="t(mobileExpanded ? 'shared.home.collapse_apps' : 'shared.home.expand_apps')"
        @click="mobileExpanded = !mobileExpanded"
      >
        <span>{{ t('shared.home.apps_title') }}</span>
        <ChevronDown class="size-5 shrink-0 transition-transform" :class="{ 'rotate-180': mobileExpanded }" aria-hidden="true" />
      </button>
      <span class="hidden sm:inline">{{ t('shared.home.apps_title') }}</span>
    </h2>
    <div id="product-directory-links" class="flex-wrap gap-3" :class="mobileExpanded ? 'flex' : 'hidden sm:flex'">
      <a
        v-for="[key, product] in products"
        :key="key"
        :href="destination(product.entry)"
        class="flex min-h-[52px] min-w-0 basis-80 grow items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 font-semibold text-sky-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-cyan-300 dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      >
        <span>{{ t(product.nameKey) }}</span>
        <span aria-hidden="true" class="shrink-0 text-slate-400 dark:text-white/40">↗</span>
      </a>
    </div>
  </section>
</template>
