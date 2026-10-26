<script setup lang="ts">
import { PRODUCTS } from "~/lib/product-domains";
const { product, config } = useProductDomain();
const { isKhmer } = useLanguage();
const { isDark, toggleColorMode, nextColorModeLabel } = useColorMode();
const productInfo = computed(() => product ? PRODUCTS[product] : null);
const links = computed(() => {
  if (product === "link") return [{ to: "/account/link", label: isKhmer.value ? "កែទំព័រ" : "Edit your page" }];
  if (product === "moment") return [{ to: "/", label: isKhmer.value ? "បង្កើត Moment" : "Create a Moment" }, { to: "/moments", label: isKhmer.value ? "Moments របស់ខ្ញុំ" : "My Moments" }];
  if (product === "games") return [{ to: "/kla-klok", label: "ខ្លាឃ្លោក · Kla Klok" }];
  return [];
});
</script>

<template>
  <header v-if="productInfo" class="sticky top-0 z-50 border-b border-black/10 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
    <div class="mx-auto flex max-w-[1244px] flex-wrap items-center justify-between gap-3">
      <NuxtLink :to="productInfo.home" class="min-h-11 content-center font-bold text-sky-700 dark:text-cyan-300">{{ productInfo.name }}</NuxtLink>
      <nav class="flex flex-wrap items-center gap-3 text-sm" :aria-label="productInfo.name">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="min-h-11 content-center">{{ link.label }}</NuxtLink>
        <NuxtLink to="/account" class="min-h-11 content-center">{{ isKhmer ? "គណនី" : "Account" }}</NuxtLink>
        <a :href="config.mainOrigin" class="min-h-11 content-center">{{ isKhmer ? "កម្មវិធីទាំងអស់" : "All apps" }}</a>
        <button type="button" class="min-h-11 px-2" :aria-label="nextColorModeLabel" @click="toggleColorMode">{{ isDark ? "☀" : "☾" }}</button>
      </nav>
    </div>
    <p v-if="product === 'draw'" class="mx-auto mt-1 max-w-[1244px] text-xs text-slate-600 dark:text-slate-300">
      {{ isKhmer ? "ទិន្នន័យរក្សាទុកក្នុង browser តាម domain នីមួយៗ។" : "Saved lists and history belong to each browser origin." }}
      <a :href="`${config.mainOrigin}/tools/lucky-draw`" class="underline">{{ isKhmer ? "បើកបញ្ជីចាស់" : "Open legacy saved lists" }}</a>
    </p>
  </header>
</template>
