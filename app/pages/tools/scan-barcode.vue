<template>
  <ScannerImageCodeScanner mode="barcode" />
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();



useSeoMeta({
  title: () => t("tools.scanBarcode.metaTitle"),
  description: () => t("tools.scanBarcode.metaDescription"),
  ogTitle: () => t("tools.scanBarcode.metaOgTitle"),
  ogDescription: () => t("tools.scanBarcode.metaOgDescription"),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/scan-barcode",
  twitterCard: "summary_large_image",
  twitterTitle: () => t("tools.scanBarcode.metaTwitterTitle"),
  twitterDescription: () => t("tools.scanBarcode.metaTwitterDescription"),
});
</script>
