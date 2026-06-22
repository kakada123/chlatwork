<script setup lang="ts">
import type { LandingToolCategory } from "~/data/tools";

const props = defineProps<{
  categories: LandingToolCategory[];
}>();

const { copy } = useLanguage();
const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
</script>

<template>
  <section id="categories" ref="sectionEl" class="px-5 py-8 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div
        class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        data-reveal
      >
        <div>
          <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
            {{ copy.categories.eyebrow }}
          </p>
          <h2 class="mt-2 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            {{ copy.categories.title }}
          </h2>
        </div>
        <NuxtLink
          to="/tools"
          class="text-sm font-bold text-sky-700 transition hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:text-cyan-300 dark:hover:text-cyan-100"
        >
          Browse all tools
        </NuxtLink>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(category, index) in props.categories"
          :key="category.name"
          :to="category.route"
          class="group relative overflow-hidden rounded-[20px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/70 backdrop-blur-xl transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.13] dark:focus:ring-cyan-200/70"
          :aria-label="`${copy.categories.explore} ${category.name}`"
          data-reveal
          :style="{ '--reveal-delay': `${index * 70}ms` }"
        >
          <div
            class="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(255,255,255,0.12),rgba(217,70,239,0.08))] opacity-80 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03),rgba(217,70,239,0.08))]"
            aria-hidden="true"
          />
          <div class="relative">
            <div class="flex items-start justify-between gap-4">
              <span
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-lg shadow-slate-200/70 ring-1 ring-black/5 dark:bg-white/[0.08] dark:shadow-black/20 dark:ring-white/10"
                aria-hidden="true"
              >
                <img
                  :src="category.iconPath"
                  alt=""
                  aria-hidden="true"
                  class="h-14 w-14 rounded-xl object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </span>

              <span
                class="rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60 dark:shadow-none"
              >
                {{ category.count }} {{ copy.categories.toolsLabel }}
              </span>
            </div>

            <h3 class="mt-3 text-lg font-black text-slate-950 dark:text-white">
              {{ category.name }}
            </h3>
            <p class="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-white/[0.62]">
              {{ category.description }}
            </p>
            <span
              class="mt-3 inline-flex text-sm font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300"
            >
              {{ copy.categories.explore }}
            </span>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
