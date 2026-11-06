<script setup lang="ts">
const { copy } = useLanguage();

useSeoMeta({
  title: computed(() => copy.value.metaTitle),
  description: computed(() => copy.value.metaDescription),
  ogTitle: computed(() => copy.value.metaTitle),
  ogDescription: computed(() => copy.value.metaDescription),
  ogType: "website",
  ogUrl: "https://chlatwork.com",
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => copy.value.metaTitle),
  twitterDescription: computed(() => copy.value.metaDescription),
});
</script>

<template>
  <div>
    <LandingProductDirectory />
    <LandingPage />
  </div>
</template>
