<template>
  <section id="projects" class="px-5 py-14 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div data-reveal class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div class="max-w-3xl">
          <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-200/90">
            Featured Projects
          </p>
          <h2 class="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
            Systems built around business workflows.
          </h2>
        </div>
        <a
          href="#contact"
          class="inline-flex h-11 items-center justify-center rounded-2xl border border-sky-200/80 bg-white/75 px-5 text-sm font-bold text-slate-900 shadow-sm shadow-sky-100/60 transition hover:-translate-y-0.5 hover:bg-white dark:border-white/[0.14] dark:bg-white/[0.07] dark:text-white/90 dark:shadow-none dark:hover:bg-white/[0.12]"
        >
          Discuss a project
        </a>
      </div>

      <div class="mt-8 grid gap-4 md:grid-cols-2">
        <article
          v-for="(project, index) in projects"
          :key="project.title"
          data-reveal
          :style="{ '--reveal-delay': `${index * 80}ms` }"
          class="group rounded-3xl border border-sky-100/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(240,249,255,0.72))] p-6 shadow-[0_18px_60px_rgba(14,165,233,0.12),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_28px_90px_rgba(14,165,233,0.18)] dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.035))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:border-white/20 dark:hover:shadow-[0_28px_90px_rgba(0,0,0,0.34)]"
        >
          <div class="flex items-start justify-between gap-5">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-slate-950 shadow-lg shadow-black/25 transition group-hover:scale-105"
              :class="project.accent"
            >
              <PortfolioIcon
                :paths="project.icon.paths"
                :view-box="project.icon.viewBox"
                class="h-7 w-7"
              />
            </div>
            <span class="rounded-full border border-sky-100 bg-sky-50/80 px-3 py-1 text-xs font-bold text-slate-500 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-400">
              Case Study
            </span>
          </div>

          <h3 class="mt-6 text-2xl font-black text-slate-950 dark:text-white">{{ project.title }}</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {{ project.description }}
          </p>

          <div class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="tag in project.tags"
              :key="tag"
              class="rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300"
            >
              {{ tag }}
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PortfolioProject } from "~/data/portfolio";

defineProps<{
  projects: PortfolioProject[];
}>();
</script>
