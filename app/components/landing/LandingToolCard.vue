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
    class="group flex min-h-[176px] w-[286px] shrink-0 transform-gpu flex-col rounded-[22px] border border-gray-200 bg-white p-4 text-left shadow-lg shadow-slate-200/60 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/10 dark:bg-white/[0.09] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14] dark:focus:ring-white/40 sm:w-[312px]"
    :class="
      props.pinned
        ? props.active
          ? 'scale-[1.02] opacity-100 shadow-2xl ring-1 ring-teal-300/80 dark:ring-[#0a84ff]/45'
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
        <h3 class="text-base font-black leading-tight text-gray-950 dark:text-white">
          {{ props.tool.name }}
        </h3>
        <p class="mt-2 line-clamp-3 text-sm leading-5 text-gray-600 dark:text-white/[0.62]">
          {{ props.tool.description }}
        </p>
      </div>
    </div>

    <div class="mt-auto flex items-center justify-between gap-3 pt-5">
      <span
        class="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60"
      >
        {{ props.tool.category }}
      </span>
      <span class="text-sm font-bold text-teal-700 transition group-hover:translate-x-1 dark:text-[#8ab4ff]">
        Open
      </span>
    </div>
  </NuxtLink>
</template>
