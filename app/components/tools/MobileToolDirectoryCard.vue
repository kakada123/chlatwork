<script setup lang="ts">
import ToolIcon from "~/components/icons/ToolIcon.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import type { LandingTool } from "~/data/tools";
import { getToolIconTone } from "~/lib/tool-icon-tones";

defineProps<{
  tool: LandingTool;
}>();
</script>

<template>
  <div class="relative h-full min-w-0">
    <NuxtLink
      :to="tool.route"
      class="mobile-pressable flex min-h-[132px] h-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.08]"
      :aria-label="`Open ${tool.name}`"
    >
      <span class="grid size-11 shrink-0 place-items-center rounded-xl" :class="getToolIconTone(tool.key)" aria-hidden="true">
        <ToolIcon :name="tool.key" class="size-6" />
      </span>
      <strong class="mt-3 line-clamp-2 text-center text-sm leading-5 text-slate-950 dark:text-white">
        {{ tool.name }}
      </strong>
    </NuxtLink>
    <ToolFavoriteButton class="absolute right-2 top-2 z-10" :tool-key="tool.key" :tool-name="tool.name" />
  </div>
</template>
