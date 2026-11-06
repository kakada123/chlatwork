<template>
  <ScannerImageCodeScanner mode="qr" />
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();



useSeoMeta({
  title: () => t("tools.scanQr.metaTitle"),
  description: () => t("tools.scanQr.metaDescription"),
  ogTitle: () => t("tools.scanQr.metaOgTitle"),
  ogDescription: () => t("tools.scanQr.metaOgDescription"),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools/scan-qr",
  twitterCard: "summary_large_image",
  twitterTitle: () => t("tools.scanQr.metaTwitterTitle"),
  twitterDescription: () => t("tools.scanQr.metaTwitterDescription"),
});
</script>
