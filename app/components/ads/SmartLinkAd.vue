<template>
  <a
    :href="smartLinkUrl"
    target="_blank"
    rel="sponsored nofollow noopener noreferrer"
    :aria-label="
      isKhmer
        ? 'បើកតំណពាណិជ្ជកម្មក្នុងផ្ទាំងថ្មី'
        : 'Open sponsored link in a new tab'
    "
    class="mx-3 mb-3 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
  >
    <span>{{ isKhmer ? "តំណពាណិជ្ជកម្ម" : "Sponsored link" }}</span>
    <span aria-hidden="true">↗</span>
  </a>
</template>

<script setup lang="ts">
const { isKhmer } = useLanguage();
const smartLinkUrl =
  "https://www.profitableratecpmnetwork.com/rrzaf01n?key=fbc5e37b18c5c66fd55e3a790c1db3b1";
</script>
