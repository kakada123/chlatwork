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
      class="flex min-h-[120px] h-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 pr-12 transition-colors duration-200 hover:border-sky-400 hover:bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      :aria-label="`Open ${tool.name}`"
    >
      <span
        class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors"
        :class="getToolIconTone(tool.key)"
        aria-hidden="true"
      >
        <ToolIcon :name="tool.key" class="size-6" />
      </span>

      <span class="min-w-0">
        <span class="block text-base font-semibold leading-6 text-slate-950 dark:text-white">
          {{ tool.name }}
        </span>
        <span class="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-white/60">
          {{ tool.description }}
        </span>
        <span class="mt-2 block text-xs font-medium text-slate-500 dark:text-white/45">
          {{ tool.category }}
        </span>
      </span>
    </NuxtLink>

    <ToolFavoriteButton
      class="absolute right-3 top-3 z-10"
      :tool-key="tool.key"
      :tool-name="tool.name"
    />
  </div>
</template>
