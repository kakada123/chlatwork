<script setup lang="ts">
import ToolIcon from "~/components/icons/ToolIcon.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

defineProps<{
  toolKey: string;
  name: string;
  route: string;
  description?: string;
  meta?: string;
}>();
</script>

<template>
  <div class="group relative h-full">
    <NuxtLink
      :to="route"
      class="flex h-full min-h-[108px] gap-3 rounded-2xl border border-slate-200 bg-white p-4 pr-12 transition-colors hover:border-sky-400 hover:bg-sky-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]"
      :aria-label="`Open ${name}`"
    >
      <span class="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors" :class="getToolIconTone(toolKey)" aria-hidden="true">
        <ToolIcon :name="toolKey" class="size-6" />
      </span>
      <span class="min-w-0">
        <strong class="block text-base font-semibold leading-6 text-slate-950 dark:text-white">{{ name }}</strong>
        <span v-if="description" class="mt-1 line-clamp-2 text-sm leading-5 text-slate-600 dark:text-white/60">{{ description }}</span>
        <span v-if="meta" class="mt-2 block text-xs font-medium text-slate-500 dark:text-white/45">{{ meta }}</span>
      </span>
    </NuxtLink>
    <ToolFavoriteButton class="absolute right-3 top-3 z-10" :tool-key="toolKey" :tool-name="name" />
  </div>
</template>
