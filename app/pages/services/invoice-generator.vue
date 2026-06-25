<script setup lang="ts">
import ServiceDetailPage from "~/components/business/ServiceDetailPage.vue";
import { BUSINESS_SERVICE_BY_SLUG } from "~/data/services";

const service = BUSINESS_SERVICE_BY_SLUG["invoice-generator"];

useSeoMeta({
  title: service.metaTitle,
  description: service.metaDescription,
  ogTitle: service.metaTitle,
  ogDescription: service.metaDescription,
  ogType: "website",
  ogUrl: `https://chlatwork.com${service.route}`,
  twitterCard: "summary_large_image",
  twitterTitle: service.metaTitle,
  twitterDescription: service.metaDescription,
});

useHead({
  link: [{ rel: "canonical", href: `https://chlatwork.com${service.route}` }],
});
</script>

<template>
  <ServiceDetailPage :service="service" />
</template>
