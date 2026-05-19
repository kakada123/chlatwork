<template>
  <section id="contact" class="px-5 py-16 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div
        data-reveal
        class="rounded-[2rem] border border-sky-100/90 bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.10)_48%,rgba(255,255,255,0.86))] p-6 shadow-[0_30px_100px_rgba(14,165,233,0.16)] backdrop-blur lg:p-8 dark:border-cyan-200/20 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(168,85,247,0.12)_48%,rgba(255,255,255,0.06))] dark:shadow-[0_30px_100px_rgba(14,165,233,0.12)]"
      >
        <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p class="text-sm font-bold uppercase text-cyan-700 dark:text-cyan-100">
              Contact
            </p>
            <h2 class="mt-3 text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
              Build a practical system that can survive real work.
            </h2>
            <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Reach out for backend systems, POS applications, business
              dashboards, API integrations, and automation tools.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <a
              v-for="link in links"
              :key="link.label"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="group rounded-2xl border border-sky-100 bg-white/75 p-4 shadow-sm shadow-sky-100/70 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white dark:border-white/10 dark:bg-slate-950/45 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-slate-950/65"
            >
              <PortfolioIcon
                :paths="link.icon.paths"
                :view-box="link.icon.viewBox"
                class="h-6 w-6 text-cyan-700 transition group-hover:scale-105 dark:text-cyan-200"
              />
              <p class="mt-4 text-sm font-bold text-slate-950 dark:text-white">{{ link.label }}</p>
              <p class="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">{{ link.value }}</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PortfolioContactLink } from "~/data/portfolio";

defineProps<{
  links: PortfolioContactLink[];
}>();
</script>
