<script setup lang="ts">
import type { LandingTool } from "~/data/tools";

const props = withDefaults(
  defineProps<{
    tool: LandingTool;
    active?: boolean;
    pinned?: boolean;
  }>(),
  {
    active: false,
    pinned: false,
  },
);
</script>

<template>
  <NuxtLink
    :to="props.tool.route"
    class="group flex min-h-[176px] w-[286px] shrink-0 transform-gpu flex-col rounded-[22px] border border-white/80 bg-white/75 p-4 text-left shadow-lg shadow-sky-100/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.09] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14] dark:focus:ring-cyan-200/70 sm:w-[312px]"
    :class="
      props.pinned
        ? props.active
          ? 'scale-[1.02] opacity-100 shadow-2xl ring-1 ring-cyan-300/80 dark:ring-cyan-300/45'
          : 'scale-100 opacity-100'
        : 'scale-100 opacity-100'
    "
  >
    <div class="flex items-start gap-3">
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-slate-200/70 transition dark:!bg-transparent dark:bg-gradient-to-br dark:!text-white dark:shadow-black/25 dark:group-hover:!bg-transparent"
        :class="[props.tool.iconClass, props.tool.accent]"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            v-for="path in props.tool.iconPaths"
            :key="path"
            :d="path"
          />
        </svg>
      </span>

      <div class="min-w-0">
        <h3 class="text-base font-black leading-tight text-slate-950 dark:text-white">
          {{ props.tool.name }}
        </h3>
        <p class="mt-2 line-clamp-3 text-sm leading-5 text-slate-600 dark:text-white/[0.62]">
          {{ props.tool.description }}
        </p>
      </div>
    </div>

    <div class="mt-auto flex items-center justify-between gap-3 pt-5">
      <span
        class="rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60"
      >
        {{ props.tool.category }}
      </span>
      <span class="text-sm font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300">
        Open
      </span>
    </div>
  </NuxtLink>
</template>
