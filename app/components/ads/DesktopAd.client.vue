<template>
  <aside
    class="hidden lg:block"
    :aria-label="isKhmer ? 'ពាណិជ្ជកម្ម' : 'Advertisement'"
  >
    <div class="sticky top-3">
      <AdsBannerAd v-if="isDesktop" placement="sidebar" />
    </div>
  </aside>
</template>

<script setup lang="ts">
const { isKhmer } = useLanguage();
const isDesktop = ref(false);
let desktopQuery: MediaQueryList | undefined;

const syncDesktop = () => {
  isDesktop.value = desktopQuery?.matches ?? false;
};

onMounted(() => {
  // CSS hiding alone would still load the desktop ad on mobile devices.
  desktopQuery = window.matchMedia("(min-width: 1024px)");
  syncDesktop();
  desktopQuery.addEventListener("change", syncDesktop);
});

onBeforeUnmount(() => {
  desktopQuery?.removeEventListener("change", syncDesktop);
});
</script>
