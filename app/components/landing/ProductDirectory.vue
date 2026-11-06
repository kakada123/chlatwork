<script setup lang="ts">
import { PRODUCTS, type Product } from "~/lib/product-domains";
const { destination } = useProductDomain();
const { isKhmer } = useLanguage();
const { websiteEnabled } = useFeatureAvailability();
const featureKeys: Partial<Record<Product, string>> = { link: "chlatwork-link", expense: "expense-tracker", draw: "lucky-draw", games: "kla-klok" };
const products = computed(() => Object.entries(PRODUCTS).filter(([key]) => !featureKeys[key as Product] || websiteEnabled(featureKeys[key as Product]!)));
</script>

<template>
  <section class="mt-2 mb-8 sm:mb-10" aria-labelledby="product-directory-title">
    <h2
      id="product-directory-title"
      class="mb-4 text-lg font-semibold tracking-tight text-[#082552] dark:text-white sm:text-xl"
    >
      {{ isKhmer ? "កម្មវិធី ChlatWork" : "ChlatWork apps" }}
    </h2>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <a
        v-for="[key, product] in products"
        :key="key"
        :href="destination(product.entry)"
        class="flex min-h-[52px] items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 font-semibold text-sky-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50/40 dark:border-white/10 dark:bg-white/[0.05] dark:text-cyan-300 dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      >
        <span>{{ isKhmer ? product.nameKm : product.name }}</span>
        <span aria-hidden="true" class="shrink-0 text-slate-400 dark:text-white/40">↗</span>
      </a>
    </div>
  </section>
</template>
