<template>
  <div
    class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
  >
    <p class="font-semibold">{{ t("tools.pdf.filesStayOnYourDeviceAndAreProcessedLocally") }}</p>
    <p class="mt-1 text-xs opacity-80">
      {{ t("tools.common.privacyDescription") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
</script>
