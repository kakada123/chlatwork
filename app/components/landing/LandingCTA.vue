<script setup lang="ts">
const { copy } = useLanguage();
</script>

<template>
  <section class="px-5 py-20 sm:px-8 lg:px-12">
    <div
      class="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/80 bg-white/70 px-6 py-14 text-center shadow-2xl shadow-sky-100/80 backdrop-blur-xl sm:px-10 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/25"
    >
      <div class="relative">
        <h2 class="text-3xl font-black text-slate-950 dark:text-white sm:text-5xl">
          {{ copy.cta.title }}
        </h2>
        <p class="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-white/[0.62]">
          {{ copy.cta.description }}
        </p>
        <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-500 px-6 text-sm font-black text-white shadow-xl shadow-sky-200/80 transition hover:-translate-y-0.5 hover:shadow-fuchsia-200/70 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:shadow-black/20"
          >
            {{ copy.cta.primaryAction }}
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200/80 bg-white/75 px-6 text-sm font-bold text-slate-950 shadow-lg shadow-sky-100/80 transition hover:-translate-y-0.5 hover:border-fuchsia-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white dark:shadow-black/20 dark:hover:bg-white/[0.12] dark:focus:ring-cyan-200/70"
          >
            {{ copy.cta.secondaryAction }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>
