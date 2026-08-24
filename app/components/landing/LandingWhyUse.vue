<script setup lang="ts">
const benefits = ["Simple to use", "Works on mobile", "Khmer and English"];
</script>

<template>
  <section class="border-y border-slate-200 py-6 dark:border-white/10" aria-label="ChlatWork benefits">
    <ul class="grid gap-4 sm:grid-cols-3">
      <li v-for="benefit in benefits" :key="benefit" class="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-white/60">
        <svg viewBox="0 0 24 24" class="size-4 text-sky-700 dark:text-cyan-300" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
        {{ benefit }}
      </li>
    </ul>
  </section>
</template>
