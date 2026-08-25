<script setup lang="ts">
import MomentCreator from "~/components/moments/MomentCreator.vue";

const { isKhmer, copy } = useMomentLanguage();

useSeoMeta({
  title: () =>
    isKhmer.value
      ? "បង្កើត Moment | ChlatWork Moments"
      : "Create a Moment | ChlatWork Moments",
  description: () => copy.value.creator.description,
  robots: "noindex, nofollow",
  ogTitle: () =>
    isKhmer.value ? "បង្កើត Moment | ChlatWork" : "Create a Moment | ChlatWork",
  ogDescription: () => copy.value.creator.title,
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/moments/create" }],
});
</script>

<template><MomentCreator /></template>
