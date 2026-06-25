<script setup lang="ts">
import BusinessCta from "~/components/business/BusinessCta.vue";
import PdfToolPage from "~/components/pdf-tools/PdfToolPage.vue";
</script>

<template>
  <div class="space-y-8">
    <PdfToolPage tool-key="invoice-to-pdf" />
    <BusinessCta service-slug="invoice-generator" compact />
  </div>
</template>
