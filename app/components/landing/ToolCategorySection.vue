<script setup lang="ts">
import type { LandingToolCategory } from "~/data/tools";

const props = defineProps<{
  categories: LandingToolCategory[];
}>();

const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
</script>

<template>
  <section ref="sectionEl" class="px-5 py-16 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div class="mb-8 max-w-2xl" data-reveal>
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600 dark:text-[#8ab4ff]">
          Tool Categories
        </p>
        <h2 class="mt-3 text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-4xl">
          Pick the right lane.
        </h2>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <NuxtLink
          v-for="(category, index) in props.categories"
          :key="category.name"
          :to="category.route"
          class="group relative overflow-hidden rounded-[28px] border border-gray-200/80 bg-white/75 p-6 shadow-xl shadow-slate-200/70 backdrop-blur transition hover:-translate-y-1 hover:border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.10] dark:focus:ring-white/40"
          data-reveal
          :style="{ '--reveal-delay': `${index * 120}ms` }"
        >
          <div
            class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-40 blur-2xl transition group-hover:opacity-70"
            :class="category.accent"
            aria-hidden="true"
          />
          <div class="relative">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm text-gray-500 dark:text-white/[0.55]">{{ category.count }} tools</p>
                <h3 class="mt-2 text-2xl font-black text-gray-950 dark:text-white">
                  {{ category.name }}
                </h3>
              </div>
              <span
                class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700 dark:border-white/10 dark:bg-white/10 dark:text-white/80"
              >
                Explore
              </span>
            </div>
            <p class="mt-5 max-w-xl text-sm leading-6 text-gray-600 dark:text-white/[0.62]">
              {{ category.description }}
            </p>
            <div class="mt-8 flex flex-wrap gap-2">
              <span
                v-for="tool in category.tools.slice(0, 5)"
                :key="tool.key"
                class="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-white/[0.08] dark:text-white/60"
              >
                {{ tool.name }}
              </span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
