<script setup lang="ts">
import DeveloperCommandsPage from "~/components/developer-commands/DeveloperCommandsPage.vue";

const title = "Developer Commands – Docker, Git, NestJS, Linux & More | ChlatWork";
const description = "Search, customize, and copy practical developer commands for Docker, Git, NestJS, Linux, PostgreSQL, Redis, Laravel, and more.";
const canonical = "https://chlatwork.com/developer-commands";

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: "website",
  ogUrl: canonical,
  twitterCard: "summary_large_image",
  twitterTitle: title,
  twitterDescription: description,
});

useHead({ link: [{ rel: "canonical", href: canonical }] });
</script>

<template><DeveloperCommandsPage /></template>
