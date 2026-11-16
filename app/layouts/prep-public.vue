<script setup lang="ts">
const { product } = useProductDomain();
</script>
<template>
  <div
    class="min-h-[calc(100dvh-var(--product-header-height,0px))] bg-[var(--app-color-page-bg)] text-slate-950 dark:bg-black dark:text-white"
  >
    <LayoutProductNavigation v-if="!product" product="prep" />
    <div class="px-3 py-4 sm:px-6 sm:py-6"><slot /></div>
  </div>
</template>
