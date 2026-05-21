<template>
  <div
    class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-100"
  >
    <p class="font-semibold">Files stay on your device and are processed locally in your browser.</p>
    <p class="mt-1 text-xs opacity-80">
      {{ LOCAL_PROCESSING_PRIVACY_NOTE }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";
</script>
