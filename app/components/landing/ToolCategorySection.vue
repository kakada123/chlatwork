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
        <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          Tool Categories
        </p>
        <h2 class="mt-3 text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
          Pick the right lane.
        </h2>
      </div>

      <div class="grid gap-5 lg:grid-cols-2">
        <NuxtLink
          v-for="(category, index) in props.categories"
          :key="category.name"
          :to="category.route"
          class="group relative overflow-hidden rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-xl shadow-sky-100/80 backdrop-blur transition hover:-translate-y-1 hover:border-sky-200 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.10] dark:focus:ring-cyan-200/70"
          data-reveal
          :style="{ '--reveal-delay': `${index * 120}ms` }"
        >
          <div
            class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br opacity-35 blur-2xl transition group-hover:opacity-60 dark:opacity-45 dark:group-hover:opacity-70"
            :class="category.accent"
            aria-hidden="true"
          />
          <div
            class="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(255,255,255,0.12),rgba(217,70,239,0.08))] opacity-80 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03),rgba(217,70,239,0.08))]"
            aria-hidden="true"
          />
          <div class="relative">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm text-slate-500 dark:text-white/[0.55]">
                  {{ category.count }} tools
                </p>
                <h3 class="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {{ category.name }}
                </h3>
              </div>
              <span
                class="rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm shadow-sky-100/70 dark:border-white/10 dark:bg-white/10 dark:text-white/80 dark:shadow-none"
              >
                Explore
              </span>
            </div>
            <p class="mt-5 max-w-xl text-sm leading-6 text-slate-600 dark:text-white/[0.62]">
              {{ category.description }}
            </p>
            <div class="mt-8 flex flex-wrap gap-2">
              <span
                v-for="tool in category.tools.slice(0, 5)"
                :key="tool.key"
                class="rounded-full border border-sky-100/70 bg-white/[0.65] px-3 py-1 text-xs text-slate-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60"
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
