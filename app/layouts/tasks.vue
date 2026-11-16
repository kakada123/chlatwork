<script setup lang="ts">
const { product: domainProduct } = useProductDomain();
</script>
<template>
  <div
    class="min-h-[calc(100dvh-var(--product-header-height,0px))] bg-[var(--app-color-page-bg)] text-slate-950 dark:bg-black dark:text-white"
  >
    <NuxtLoadingIndicator color="#0369a1" />
    <LayoutProductNavigation v-if="!domainProduct" product="tasks" />
    <slot />
  </div>
</template>
