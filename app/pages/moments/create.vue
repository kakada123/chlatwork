<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import MomentCreator from "~/components/moments/MomentCreator.vue";

definePageMeta({ layout: "moment-editor", momentEditor: true });

const { isKhmer, copy } = useMomentLanguage();

const { t } = useAppI18n(isKhmer);
const { canonical } = useProductDomain();

useSeoMeta({
  title: () =>
    t("products.moments.create_a_moment_chlat_work_moments"),
  description: () => copy.value.creator.description,
  robots: "noindex, nofollow",
  ogTitle: () =>
    t("products.moments.create_a_moment_chlat_work"),
  ogDescription: () => copy.value.creator.title,
});

useHead(() => ({ link: [{ rel: "canonical", href: canonical.value }] }));
</script>

<template><MomentCreator /></template>
