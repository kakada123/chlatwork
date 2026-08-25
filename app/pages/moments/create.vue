<script setup lang="ts">
import MomentCreator from "~/components/moments/MomentCreator.vue";

useSeoMeta({
  title: "Create a Moment | ChlatWork Moments",
  description:
    "Turn your photos and message into a beautiful interactive celebration page for someone special.",
  robots: "noindex, nofollow",
  ogTitle: "Create a Moment | ChlatWork",
  ogDescription: "Create a little place on the internet for someone special.",
});

useHead({
  link: [{ rel: "canonical", href: "https://chlatwork.com/moments/create" }],
});
</script>

<template><MomentCreator /></template>
