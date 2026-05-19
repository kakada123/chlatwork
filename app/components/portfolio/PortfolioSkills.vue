<template>
  <section id="skills" class="px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div data-reveal class="max-w-3xl">
        <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-200/90">
          Skills
        </p>
        <h2 class="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
          Backend-first, full-stack when the product needs it.
        </h2>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article
          v-for="(group, index) in groups"
          :key="group.title"
          data-reveal
          :style="{ '--reveal-delay': `${index * 70}ms` }"
          class="group rounded-2xl border border-sky-100/90 bg-white/75 p-5 shadow-sm shadow-sky-100/70 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white hover:shadow-[0_24px_70px_rgba(14,165,233,0.18)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/[0.09] dark:hover:shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-slate-950 shadow-lg shadow-black/25 transition group-hover:scale-105"
            :class="group.accent"
          >
            <PortfolioIcon
              :paths="group.icon.paths"
              :view-box="group.icon.viewBox"
              class="h-6 w-6"
            />
          </div>
          <h3 class="mt-5 text-lg font-black text-slate-950 dark:text-white">{{ group.title }}</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {{ group.description }}
          </p>
          <div class="mt-5 flex flex-wrap gap-2">
            <span
              v-for="skill in group.skills"
              :key="skill"
              class="rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-300"
            >
              {{ skill }}
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PortfolioSkillGroup } from "~/data/portfolio";

defineProps<{
  groups: PortfolioSkillGroup[];
}>();
</script>
