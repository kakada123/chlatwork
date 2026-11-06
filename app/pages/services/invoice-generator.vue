<script setup lang="ts">
import { localizeBusinessService } from "~/data/services-km";
import ServiceDetailPage from "~/components/business/ServiceDetailPage.vue";
import { BUSINESS_SERVICE_BY_SLUG } from "~/data/services";

const { locale } = useLanguage();
const service = computed(() => localizeBusinessService(BUSINESS_SERVICE_BY_SLUG["invoice-generator"], locale.value));

useSeoMeta({
  title: () => service.value.metaTitle,
  description: () => service.value.metaDescription,
  ogTitle: () => service.value.metaTitle,
  ogDescription: () => service.value.metaDescription,
  ogType: "website",
  ogUrl: `https://chlatwork.com${service.value.route}`,
  twitterCard: "summary_large_image",
  twitterTitle: () => service.value.metaTitle,
  twitterDescription: () => service.value.metaDescription,
});

useHead({
  link: [{ rel: "canonical", href: `https://chlatwork.com${service.route}` }],
});
</script>

<template>
  <ServiceDetailPage :service="service" />
</template>
