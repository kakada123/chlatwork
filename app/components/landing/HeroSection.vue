<script setup lang="ts">
import HomeGlobalSearch from "./HomeGlobalSearch.vue";
import type { LandingTool } from "~/data/tools";

const props = defineProps<{
  tools: LandingTool[];
  popularTools: LandingTool[];
}>();

const { copy } = useLanguage();
const visiblePopularTools = computed(() => props.popularTools.slice(0, 8));
</script>

<template>
  <section
    class="border-b border-sky-100/70 bg-[linear-gradient(135deg,#f8fbff_0%,#eef7ff_56%,#fff7fe_100%)] px-4 pb-5 pt-5 text-slate-950 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8 dark:border-white/10 dark:bg-[linear-gradient(135deg,#020712_0%,#070b17_56%,#02040b_100%)] dark:text-white"
  >
    <div class="mx-auto max-w-7xl">
      <div class="max-w-4xl">
        <h1
          class="text-3xl font-black leading-tight text-slate-950 sm:text-4xl dark:text-white"
        >
          {{ copy.hero.title }}
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
          {{ copy.hero.description }}
        </p>

        <HomeGlobalSearch class="mt-4 max-w-3xl" :tools="props.tools" />
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <h2 class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          Popular tools
        </h2>
        <NuxtLink
          to="/tools"
          class="text-sm font-bold text-sky-700 transition hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:text-cyan-300 dark:hover:text-cyan-100"
        >
          Browse all
        </NuxtLink>
      </div>

      <div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="tool in visiblePopularTools"
          :key="tool.key"
          :to="tool.route"
          class="group relative flex min-h-[116px] min-w-0 flex-col overflow-hidden rounded-[20px] border border-white/80 bg-white/75 p-3 shadow-lg shadow-sky-100/70 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.13] dark:focus:ring-cyan-200/70"
          :aria-label="`Open ${tool.name}`"
        >
          <span
            class="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.10),rgba(255,255,255,0.12),rgba(217,70,239,0.08))] opacity-80 dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.08),rgba(255,255,255,0.03),rgba(217,70,239,0.08))]"
            aria-hidden="true"
          />
          <span class="relative z-10 flex min-w-0 items-start gap-2.5">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm shadow-slate-200/70 ring-1 ring-black/5 transition group-hover:scale-105 dark:bg-white/[0.08] dark:shadow-black/20 dark:ring-white/10"
              aria-hidden="true"
            >
              <img
                :src="tool.iconPath"
                alt=""
                aria-hidden="true"
                class="h-11 w-11 rounded-lg object-contain"
                decoding="async"
              />
            </span>

            <span class="min-w-0 flex-1">
              <span
                class="block truncate text-sm font-black text-slate-950 dark:text-white"
              >
                {{ tool.name }}
              </span>
              <span
                class="mt-1 line-clamp-2 block text-xs leading-5 text-slate-600 dark:text-white/[0.62]"
              >
                {{ tool.description }}
              </span>
            </span>
          </span>

          <span class="relative z-10 mt-auto flex items-center justify-between gap-2 pt-2">
            <span
              class="truncate rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm shadow-sky-100/60 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60 dark:shadow-none"
            >
              {{ tool.category }}
            </span>
            <span class="shrink-0 text-sm font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300">
              Open
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
