<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();



useSeoMeta({
  title: () => t("tools.imageCompress.metaTitle"),
  description: () => t("tools.imageCompress.metaDescription"),
  ogTitle: () => t("tools.imageCompress.metaOgTitle"),
  ogDescription: () => t("tools.imageCompress.metaOgDescription"),
});
</script>

<template>
  <main class="w-full max-w-[1440px] mx-auto">
    <ImageCompressor />
  </main>
</template>
