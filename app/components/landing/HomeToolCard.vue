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
  <div class="group relative h-full">
    <NuxtLink
      :to="tool.route"
      class="flex min-h-[96px] h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 pr-12 shadow-sm transition-colors duration-200 hover:border-sky-400 hover:bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      :aria-label="`Open ${tool.name}`"
    >
      <span
        class="flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors"
        :class="getToolIconTone(tool.key)"
        aria-hidden="true"
      >
        <ToolIcon :name="tool.key" class="size-6" />
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-base font-semibold leading-6 text-slate-950 dark:text-white">
          {{ tool.name }}
        </span>
        <span class="mt-1 block text-xs font-semibold text-sky-700 dark:text-cyan-300">Open →</span>
      </span>
    </NuxtLink>

    <ToolFavoriteButton
      class="absolute right-3 top-3 z-10"
      :tool-key="tool.key"
      :tool-name="tool.name"
    />
  </div>
</template>
