<script setup lang="ts">
import { ENABLED_TOOLS, type ToolDef } from "~/lib/tool-registry";
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";
import { LANDING_TOOLS } from "~/data/tools";
import ToolDirectoryCard from "~/components/tools/ToolDirectoryCard.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import HomeGlobalSearch from "~/components/landing/HomeGlobalSearch.vue";
import MobileToolsDirectory from "~/components/tools/MobileToolsDirectory.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

const { categoryLabel, copy, localizeTool } = useLanguage();
const localizedEnabledTools = computed(() => ENABLED_TOOLS.map(localizeTool));
const searchableTools = computed(() => LANDING_TOOLS.map(localizeTool));
const groupedTools = computed(() => groupTools(localizedEnabledTools.value));
const directoryCategories = computed(() =>
  TOOL_DIRECTORY_CATEGORIES.map((category) => ({
    ...category,
    count: getToolsForDirectoryCategory(category).length,
  })),
);
const pageEl = ref<HTMLElement | null>(null);

useLandingReveal(pageEl);
useSeoMeta({
  title: computed(() => copy.value.toolsPage.metaTitle),
  description: computed(() => copy.value.toolsPage.metaDescription),
  ogTitle: computed(() => copy.value.toolsPage.metaTitle),
  ogDescription: computed(() => copy.value.toolsPage.metaDescription),
  ogType: "website",
  ogUrl: "https://chlatwork.com/tools",
  twitterCard: "summary_large_image",
  twitterTitle: computed(() => copy.value.toolsPage.metaTitle),
  twitterDescription: computed(() => copy.value.toolsPage.metaDescription),
});

function groupTools(tools: ToolDef[]) {
  const groups = new Map<string, ToolDef[]>();

  for (const tool of tools) {
    const current = groups.get(tool.category) ?? [];
    current.push(tool);
    groups.set(tool.category, current);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    tools: items,
  }));
}
</script>

<template>
  <main ref="pageEl" class="mx-auto w-full max-w-[1200px]">
    <MobileToolsDirectory class="sm:hidden" :tools="searchableTools" :categories="directoryCategories" />

    <div class="hidden space-y-8 sm:block">
    <header class="sr-only" data-reveal>
      <h1>
        {{ copy.toolsPage.title }}
      </h1>
    </header>

    <section class="mx-auto w-full max-w-3xl" data-reveal aria-label="Search tools">
      <HomeGlobalSearch :tools="searchableTools" />
    </section>

    <section class="space-y-3" data-reveal>
      <div>
        <h2 class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
          Tool categories
        </h2>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(category, categoryIndex) in directoryCategories"
          :key="category.key"
          :to="category.path"
          class="group flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white/75 p-3 transition hover:border-sky-300 hover:bg-sky-50/60 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/20 dark:hover:bg-white/[0.1]"
          data-reveal
          :style="{ '--reveal-delay': `${categoryIndex * 45}ms` }"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <span
              class="flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors"
              :class="getToolIconTone(category.key)"
              aria-hidden="true"
            >
              <ToolIcon :name="category.key" class="size-6" />
            </span>
            <div class="min-w-0 flex-1">
              <h3 class="text-base font-black text-slate-950 dark:text-white">
                {{ category.shortTitle }}
              </h3>
              <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-white/50">
                {{ category.count }} tools
              </p>
            </div>
          </div>
          <span aria-hidden="true" class="text-sky-700 dark:text-cyan-300">→</span>
        </NuxtLink>
      </div>
    </section>

    <section
      v-for="(group, groupIndex) in groupedTools"
      :key="group.category"
      class="space-y-3"
      data-reveal
      :style="{ '--reveal-delay': `${groupIndex * 120}ms` }"
    >
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2
            class="text-sm font-semibold uppercase text-slate-500 dark:text-white/45"
          >
            {{ categoryLabel(group.category) }}
          </h2>
          <p class="mt-1 text-xs text-slate-400 dark:text-white/35">
            {{ group.tools.length }} tools
          </p>
        </div>
      </div>

      <ul
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
      >
        <li
          v-for="(tool, toolIndex) in group.tools"
          :key="tool.key"
          class="h-full"
          data-reveal
          :style="{
            '--reveal-delay': `${groupIndex * 120 + toolIndex * 60}ms`,
          }"
        >
          <ToolDirectoryCard :tool-key="tool.key" :name="tool.name" :route="tool.route" :description="tool.description" :meta="categoryLabel(tool.category)" />
        </li>
      </ul>
    </section>
    </div>
  </main>
</template>
