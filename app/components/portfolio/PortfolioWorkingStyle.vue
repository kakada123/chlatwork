<template>
  <section class="px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div
        class="grid gap-8 rounded-[2rem] border border-sky-100/90 bg-white/75 p-6 shadow-[0_18px_70px_rgba(14,165,233,0.12)] backdrop-blur lg:grid-cols-[0.8fr_1.2fr] lg:p-8 dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none"
      >
        <div data-reveal>
          <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-200/90">
            Working Style
          </p>
          <h2 class="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
            Clean, secure, performant, and maintainable.
          </h2>
          <p class="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-400">
            Kakada works from the business rule outward, then keeps the code
            organized enough for the next feature, teammate, or production issue.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <article
            v-for="(item, index) in items"
            :key="item.title"
            data-reveal
            :style="{ '--reveal-delay': `${index * 70}ms` }"
            class="rounded-2xl border border-sky-100 bg-white/80 p-5 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-slate-950/55 dark:shadow-none"
          >
            <PortfolioIcon
              :paths="item.icon.paths"
              :view-box="item.icon.viewBox"
              class="h-7 w-7 text-cyan-700 dark:text-cyan-200"
            />
            <h3 class="mt-4 text-lg font-black text-slate-950 dark:text-white">{{ item.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {{ item.description }}
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PortfolioWorkingStyle } from "~/data/portfolio";

defineProps<{
  items: PortfolioWorkingStyle[];
}>();
</script>
