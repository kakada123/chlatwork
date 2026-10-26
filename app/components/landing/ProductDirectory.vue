<script setup lang="ts">
import { PRODUCTS, type Product } from "~/lib/product-domains";
const { destination } = useProductDomain();
const { isKhmer } = useLanguage();
const { websiteEnabled } = useFeatureAvailability();
const featureKeys: Partial<Record<Product, string>> = { link: "chlatwork-link", expense: "expense-tracker", draw: "lucky-draw", games: "kla-klok" };
const products = computed(() => Object.entries(PRODUCTS).filter(([key]) => !featureKeys[key as Product] || websiteEnabled(featureKeys[key as Product]!)));
</script>

<template>
  <section class="mx-auto max-w-[1244px] px-4 py-6 sm:px-6" aria-labelledby="product-directory-title">
    <h2 id="product-directory-title" class="mb-4 text-xl font-bold">{{ isKhmer ? "កម្មវិធី ChlatWork" : "ChlatWork apps" }}</h2>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <a v-for="[key, product] in products" :key="key" :href="destination(product.entry)" class="rounded-2xl border border-black/10 bg-white p-4 font-semibold text-sky-700 transition hover:border-sky-400 dark:border-white/15 dark:bg-white/5 dark:text-cyan-300">{{ product.name }} <span aria-hidden="true">↗</span></a>
    </div>
  </section>
</template>
