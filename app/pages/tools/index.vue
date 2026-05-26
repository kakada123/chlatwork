<script setup lang="ts">
import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";
import { filterTools } from "~/lib/tool-search";
import { TOOL_GUIDES } from "~/data/tool-guides";
import {
  TOOL_DIRECTORY_CATEGORIES,
  getToolsForDirectoryCategory,
} from "~/data/tool-categories";

const { categoryLabel, copy, lineHeightForText, localizeTool } = useLanguage();
const toolSearch = ref("");
const toolSearchInput = ref<HTMLInputElement | null>(null);
const localizedEnabledTools = computed(() =>
  ENABLED_TOOLS.map(localizeTool),
);

const filteredTools = computed(() =>
  filterTools(localizedEnabledTools.value, toolSearch.value),
);
const groupedTools = computed(() => groupTools(filteredTools.value));
const filteredToolCount = computed(() => filteredTools.value.length);
const isToolSearchActive = computed(() => toolSearch.value.trim().length > 0);
const guideCards = TOOL_GUIDES;
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

function clearToolSearch() {
  toolSearch.value = "";
  toolSearchInput.value?.focus();
}

function handleToolSearchEvent(event: Event) {
  const input = event.target as HTMLInputElement;

  if (!input.value) {
    clearToolSearch();
  }
}

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
  <main ref="pageEl" class="mx-auto w-full max-w-[1440px] space-y-10">
    <header class="space-y-2" data-reveal>
      <p
        class="text-xs font-semibold uppercase text-sky-600 dark:text-cyan-300"
      >
        {{ copy.toolsPage.eyebrow }}
      </p>
      <h1 class="text-3xl font-black text-slate-950 dark:text-white sm:text-4xl">
        {{ copy.toolsPage.title }}
      </h1>
      <p class="max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/65">
        {{ copy.toolsPage.description }}
      </p>
    </header>

    <section
      data-reveal
      class="rounded-[22px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.09] dark:shadow-black/20"
    >
      <label
        for="tool-search"
        class="block text-sm font-semibold text-slate-900 dark:text-white"
      >
        Search tools
      </label>
      <div class="mt-2 flex gap-2">
        <input
          id="tool-search"
          ref="toolSearchInput"
          v-model="toolSearch"
          type="search"
          class="h-11 min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white/90 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-200/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/35 dark:focus:border-cyan-300/50 dark:focus:ring-cyan-200/40"
          :placeholder="copy.nav.searchTools"
          @search="handleToolSearchEvent"
        />
        <button
          v-if="toolSearch"
          type="button"
          class="h-11 shrink-0 rounded-xl border border-slate-200/80 bg-white/90 px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.10]"
          @click="clearToolSearch"
        >
          Clear
        </button>
      </div>
      <p class="mt-2 text-xs text-slate-500 dark:text-white/50">
        {{ filteredToolCount }} of {{ localizedEnabledTools.length }} tools
      </p>
    </section>

    <section
      v-if="filteredToolCount === 0"
      data-reveal
      class="rounded-[22px] border border-dashed border-slate-200/80 bg-white/75 p-6 text-center text-sm text-slate-500 shadow-lg shadow-sky-100/50 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55"
    >
      {{ copy.toolsPage.emptyState }}
    </section>

    <section v-if="!isToolSearchActive" class="space-y-3" data-reveal>
      <div>
        <h2 class="text-2xl font-black text-slate-950 dark:text-white">
          Tool categories
        </h2>
        <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-white/65">
          Browse by task type when you know the kind of work you need to finish.
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="(category, categoryIndex) in directoryCategories"
          :key="category.key"
          :to="category.path"
          class="group rounded-[22px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/70 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.13]"
          data-reveal
          :style="{ '--reveal-delay': `${categoryIndex * 45}ms` }"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-base font-black text-slate-950 dark:text-white">
                {{ category.shortTitle }}
              </h3>
              <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-white/60">
                {{ category.description }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60"
            >
              {{ category.count }}
            </span>
          </div>
          <span
            class="mt-4 inline-flex text-xs font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300"
          >
            Browse category
          </span>
        </NuxtLink>
      </div>
    </section>

    <section v-if="!isToolSearchActive" class="space-y-3" data-reveal>
      <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 class="text-2xl font-black text-slate-950 dark:text-white">
            Learn how to use our tools
          </h2>
          <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-white/65">
            Beginner-friendly guides with examples, tips, and direct links to
            each ChlatWork tool.
          </p>
        </div>
        <p class="text-xs font-semibold uppercase text-slate-400">
          {{ guideCards.length }} guides
        </p>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="(guide, guideIndex) in guideCards"
          :key="guide.slug"
          :to="guide.path"
          class="group rounded-[22px] border border-white/80 bg-white/75 p-4 shadow-lg shadow-sky-100/70 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.08] dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.13] dark:focus:ring-cyan-200/70"
          data-reveal
          :style="{ '--reveal-delay': `${guideIndex * 35}ms` }"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-110 dark:ring-white/10"
              :class="guide.iconClass"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in guide.iconPaths"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>
            <div class="min-w-0">
              <h3
                class="line-clamp-2 text-sm font-black leading-5 text-slate-950 dark:text-white"
              >
                {{ guide.heroTitle }}
              </h3>
              <p class="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 dark:text-white/60">
                {{ guide.metaDescription }}
              </p>
            </div>
          </div>
          <span
            class="mt-4 inline-flex text-xs font-bold text-sky-700 transition group-hover:translate-x-1 dark:text-cyan-300"
          >
            Read guide
          </span>
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

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <NuxtLink
          v-for="(tool, toolIndex) in group.tools"
          :key="tool.key"
          :to="tool.route"
          class="group flex h-full flex-col rounded-[22px] border border-white/80 bg-white/75 p-4 text-left shadow-lg shadow-sky-100/80 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-white/95 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.09] dark:text-white dark:shadow-black/20 dark:hover:border-white/20 dark:hover:bg-white/[0.14] dark:focus:ring-cyan-200/70"
          data-reveal
          :style="{ '--reveal-delay': `${groupIndex * 120 + toolIndex * 60}ms` }"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm shadow-slate-200/70 ring-1 ring-black/5 transition duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 dark:ring-white/10"
              :class="
                TOOL_ICON_CLASSES[tool.key] || TOOL_ICON_CLASSES.calculator
              "
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in TOOL_ICON_PATHS[tool.key] ||
                  TOOL_ICON_PATHS.calculator"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>

            <div class="min-w-0">
              <h3
                :style="{ lineHeight: lineHeightForText(tool.name, 'heading') }"
                class="text-base font-black text-slate-950 dark:text-white sm:truncate"
              >
                {{ tool.name }}
              </h3>
              <p
                :style="{ lineHeight: lineHeightForText(tool.description, 'body') }"
                class="mt-2 line-clamp-3 text-sm text-slate-600 dark:text-white/65"
              >
                {{ tool.description }}
              </p>
            </div>
          </div>

          <div class="mt-auto flex items-center justify-between gap-3 pt-5">
            <span
              class="rounded-full border border-sky-100 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm shadow-sky-100/40 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/60"
            >
              {{ tool.category }}
            </span>

            <span
              class="text-sm font-semibold text-sky-700 transition duration-300 group-hover:translate-x-1 dark:text-cyan-300"
            >
              Open
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
