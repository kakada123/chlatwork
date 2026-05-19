<template>
  <section id="about" class="px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <div data-reveal>
        <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-200/90">
          About
        </p>
        <h2 class="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
          Practical software for real operations.
        </h2>
      </div>

      <div data-reveal="right" class="space-y-5">
        <p
          v-for="paragraph in paragraphs"
          :key="paragraph"
          class="text-base leading-8 text-slate-600 dark:text-slate-300"
        >
          {{ paragraph }}
        </p>

        <div class="grid gap-3 sm:grid-cols-3">
          <div
            v-for="highlight in highlights"
            :key="highlight"
            class="rounded-2xl border border-sky-100/90 bg-white/75 p-4 text-sm font-semibold leading-6 text-slate-800 shadow-sm shadow-sky-100/60 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-white/90 dark:shadow-none"
          >
            {{ highlight }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  paragraphs: string[];
  highlights: string[];
}>();
</script>
