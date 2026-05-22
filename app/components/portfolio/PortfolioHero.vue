<template>
  <section
    class="relative overflow-hidden px-5 py-16 sm:px-8 lg:px-12 lg:py-24"
  >
    <div
      class="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.055)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45 dark:bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] dark:opacity-35"
      aria-hidden="true"
    />
    <div
      class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent"
      aria-hidden="true"
    />

    <div
      class="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
    >
      <div data-reveal>
        <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-200/90">
          {{ profile.title }}
        </p>
        <h1
          class="mt-5 max-w-3xl text-5xl font-black leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white"
        >
          {{ profile.name }}
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl dark:text-slate-300">
          {{ profile.tagline }}
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <a
            href="#projects"
            class="inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-300 via-blue-500 to-fuchsia-500 px-7 text-sm font-bold text-white shadow-[0_18px_50px_rgba(59,130,246,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(168,85,247,0.36)] focus:outline-none focus:ring-2 focus:ring-cyan-200"
          >
            View Projects
          </a>
          <a
            href="#contact"
            class="inline-flex h-12 items-center justify-center rounded-2xl border border-sky-200/80 bg-white/75 px-7 text-sm font-bold text-slate-900 shadow-[0_16px_40px_rgba(14,165,233,0.13),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/[0.14] dark:bg-white/[0.07] dark:text-white/90 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] dark:hover:bg-white/[0.12] dark:focus:ring-white/50"
          >
            Contact Me
          </a>
          <a
            :href="profile.cvPath"
            download
            class="inline-flex h-12 items-center justify-center rounded-2xl border border-cyan-200/80 bg-cyan-50/80 px-7 text-sm font-bold text-cyan-800 transition hover:-translate-y-0.5 hover:bg-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-300 dark:border-cyan-200/25 dark:bg-cyan-200/10 dark:text-cyan-100 dark:hover:bg-cyan-200/[0.16] dark:focus:ring-cyan-200"
          >
            Download CV
          </a>
        </div>
      </div>

      <div data-reveal="right" class="lg:justify-self-end">
        <div
          class="overflow-hidden rounded-[2rem] border border-sky-100/90 bg-white/[0.78] shadow-[0_34px_110px_rgba(14,165,233,0.17),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl dark:border-white/[0.12] dark:bg-white/[0.07] dark:shadow-[0_34px_110px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.10)]"
        >
          <div class="flex items-center gap-2 border-b border-sky-100/90 px-5 py-4 dark:border-white/10">
            <span class="h-3 w-3 rounded-full bg-rose-400" />
            <span class="h-3 w-3 rounded-full bg-amber-300" />
            <span class="h-3 w-3 rounded-full bg-emerald-300" />
            <span class="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400">
              kakada.system.ts
            </span>
          </div>

          <div class="space-y-5 p-5 sm:p-7">
            <div class="rounded-2xl border border-slate-200 bg-white/[0.85] p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70 dark:shadow-none">
              <p class="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                developer.profile()
              </p>
              <div class="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                <p>
                  <span class="text-fuchsia-700 dark:text-fuchsia-200">focus:</span>
                  backend architecture + real business workflows
                </p>
                <p>
                  <span class="text-fuchsia-700 dark:text-fuchsia-200">ships:</span>
                  APIs, dashboards, POS apps, automations
                </p>
                <p>
                  <span class="text-fuchsia-700 dark:text-fuchsia-200">stack:</span>
                  NestJS, Laravel, Vue, Nuxt, Electron
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div
                v-for="metric in metrics"
                :key="metric.value"
                class="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none"
              >
                <p class="text-lg font-black text-slate-950 dark:text-white">{{ metric.value }}</p>
                <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {{ metric.label }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { portfolioMetrics, portfolioProfile } from "~/data/portfolio";

defineProps<{
  profile: typeof portfolioProfile;
  metrics: typeof portfolioMetrics;
}>();
</script>
