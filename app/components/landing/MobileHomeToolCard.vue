<script setup lang="ts">
import ToolIcon from "~/components/icons/ToolIcon.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import type { LandingTool } from "~/data/tools";
import { getToolIconTone } from "~/lib/tool-icon-tones";

withDefaults(defineProps<{
  tool: LandingTool;
  variant?: "recent" | "tile";
  meta?: string;
}>(), {
  variant: "tile",
  meta: "",
});
</script>

<template>
  <div v-if="variant === 'recent'" class="group relative h-full w-32 shrink-0">
    <NuxtLink
      :to="tool.route"
      class="mobile-pressable flex h-full min-h-[138px] flex-col rounded-2xl border border-slate-200 bg-white p-3 pr-9 shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.08]"
      :aria-label="`Continue with ${tool.name}`"
    >
      <span
        class="flex size-10 shrink-0 items-center justify-center rounded-xl"
        :class="getToolIconTone(tool.key)"
        aria-hidden="true"
      >
        <ToolIcon :name="tool.key" class="size-5" />
      </span>
      <span class="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-950 dark:text-white">
        {{ tool.name }}
      </span>
      <span class="mt-auto pt-2 text-[11px] text-slate-500 dark:text-white/45">
        {{ meta }}
      </span>
    </NuxtLink>

    <ToolFavoriteButton
      class="absolute right-2 top-2 z-10"
      :tool-key="tool.key"
      :tool-name="tool.name"
    />
  </div>

  <NuxtLink
    v-else
    :to="tool.route"
    class="mobile-pressable flex min-h-[108px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 text-center shadow-sm transition-colors hover:border-sky-300 hover:bg-sky-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/30 dark:hover:bg-white/[0.08]"
    :aria-label="`Open ${tool.name}`"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-xl"
      :class="getToolIconTone(tool.key)"
      aria-hidden="true"
    >
      <ToolIcon :name="tool.key" class="size-5" />
    </span>
    <span class="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-slate-950 dark:text-white">
      {{ tool.name }}
    </span>
  </NuxtLink>
</template>
