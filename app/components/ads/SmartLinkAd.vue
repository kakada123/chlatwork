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
    class="mx-3 mb-3 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
  >
    <span class="inline-flex items-center gap-1.5">
      <span>{{ isKhmer ? "មើលឥឡូវនេះ" : "Explore now" }}</span>
      <span aria-hidden="true">↗</span>
    </span>
    <span class="text-[10px] font-normal text-slate-400 dark:text-white/40">
      {{ isKhmer ? "ពាណិជ្ជកម្ម" : "Ad" }}
    </span>
  </a>
</template>

<script setup lang="ts">
const { isKhmer } = useLanguage();
const smartLinkUrl =
  "https://www.profitableratecpmnetwork.com/rrzaf01n?key=fbc5e37b18c5c66fd55e3a790c1db3b1";
</script>
