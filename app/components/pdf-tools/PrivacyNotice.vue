<template>
  <div
    class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
  >
    <p class="font-semibold">{{ isKhmer ? "ឯកសាររបស់អ្នកស្ថិតនៅលើឧបករណ៍របស់អ្នក ហើយដំណើរការនៅក្នុង Browser របស់អ្នកដោយផ្ទាល់។" : "Files stay on your device and are processed locally in your browser." }}</p>
    <p class="mt-1 text-xs opacity-80">
      {{ isKhmer ? "ទិន្នន័យរបស់អ្នកត្រូវបានដំណើរការនៅក្នុង browser របស់អ្នកតាមដែលអាចធ្វើទៅបាន។ យើងមិនរក្សាទុកឯកសារ ឬព័ត៌មានរបស់អ្នកនៅលើ Server របស់យើងឡើយ។" : LOCAL_PROCESSING_PRIVACY_NOTE }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { isKhmer } = useLanguage();
</script>
