<script setup lang="ts">
import type { LandingTool } from "~/data/tools";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

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
  <div
    class="group relative w-[286px] shrink-0 sm:w-[312px]"
    :class="
      props.pinned
        ? props.active
          ? 'scale-[1.02] opacity-100 shadow-2xl ring-1 ring-cyan-300/80 dark:ring-cyan-300/45'
          : 'scale-100 opacity-100'
        : 'scale-100 opacity-100'
    "
  >
    <NuxtLink :to="props.tool.route" class="flex min-h-[96px] transform-gpu items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 pr-12 text-left shadow-sm transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]">
      <span
        class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors"
        :class="getToolIconTone(props.tool.key)"
        aria-hidden="true"
      >
        <ToolIcon :name="props.tool.key" class="size-6" />
      </span>

      <div class="min-w-0 flex-1">
        <h3 class="text-base font-semibold leading-6 text-slate-950 dark:text-white">
          {{ props.tool.name }}
        </h3>
        <span class="mt-1 block text-xs font-semibold text-sky-700 dark:text-cyan-300">Open →</span>
      </div>
    </NuxtLink>
    <ToolFavoriteButton class="absolute right-3 top-3 z-10" :tool-key="props.tool.key" :tool-name="props.tool.name" />
  </div>
</template>
