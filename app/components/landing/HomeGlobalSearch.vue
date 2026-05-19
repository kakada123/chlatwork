<script setup lang="ts">
import { TOOL_GUIDES, type ToolGuide } from "~/data/tool-guides";
import type { LandingTool } from "~/data/tools";
import { filterTools, searchTextMatches } from "~/lib/tool-search";

const props = defineProps<{
  tools: LandingTool[];
}>();

type SearchResult = {
  key: string;
  title: string;
  description: string;
  path: string;
  iconPaths: string[];
  iconClass: string;
  label: string;
};

const { copy } = useLanguage();
const globalSearch = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const isSearchActive = computed(() => globalSearch.value.trim().length > 0);

const toolResults = computed<SearchResult[]>(() =>
  filterTools(props.tools, globalSearch.value)
    .slice(0, 5)
    .map((tool) => ({
      key: `tool-${tool.key}`,
      title: tool.name,
      description: tool.description,
      path: tool.route,
      iconPaths: tool.iconPaths,
      iconClass: tool.iconClass,
      label: copy.value.heroSearch.toolsLabel,
    })),
);

const guideResults = computed<SearchResult[]>(() =>
  TOOL_GUIDES.filter((guide) =>
    searchTextMatches(getGuideSearchText(guide), globalSearch.value),
  )
    .slice(0, 4)
    .map((guide) => ({
      key: `guide-${guide.slug}`,
      title: guide.heroTitle,
      description: guide.metaDescription,
      path: guide.path,
      iconPaths: guide.iconPaths,
      iconClass: guide.iconClass,
      label: copy.value.heroSearch.guidesLabel,
    })),
);

const visibleResults = computed(() =>
  isSearchActive.value ? [...toolResults.value, ...guideResults.value] : [],
);
const topResult = computed(() => visibleResults.value[0] ?? null);

function getGuideSearchText(guide: ToolGuide) {
  return [
    guide.heroTitle,
    guide.metaTitle,
    guide.metaDescription,
    guide.tool.name,
    guide.tool.description,
    guide.tool.key,
    guide.path,
    ...guide.keywords,
  ].join(" ");
}

function clearSearch() {
  globalSearch.value = "";
  searchInput.value?.focus();
}

function handleNativeSearch(event: Event) {
  const input = event.target as HTMLInputElement;

  if (!input.value) {
    clearSearch();
  }
}

function searchExample(example: string) {
  globalSearch.value = example;
  searchInput.value?.focus();
}

function openTopResult() {
  if (!topResult.value) {
    return;
  }

  navigateTo(topResult.value.path);
}
</script>

<template>
  <div class="max-w-xl">
    <label
      for="home-global-search"
      class="mb-2 block text-sm font-bold text-slate-900 dark:text-white"
    >
      {{ copy.heroSearch.label }}
    </label>

    <div
      class="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_20px_60px_rgba(14,165,233,0.18)] backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.07] dark:shadow-black/25"
    >
      <div class="flex items-center gap-3 px-4 py-3">
        <svg
          viewBox="0 0 24 24"
          class="h-5 w-5 shrink-0 text-sky-600 dark:text-cyan-300"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>

        <input
          id="home-global-search"
          ref="searchInput"
          v-model="globalSearch"
          type="search"
          class="h-11 min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/35"
          :placeholder="copy.heroSearch.placeholder"
          @keydown.enter.prevent="openTopResult"
          @keydown.esc="clearSearch"
          @search="handleNativeSearch"
        />

        <button
          v-if="globalSearch"
          type="button"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-200"
          :aria-label="copy.heroSearch.clear"
          @click="clearSearch"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div
        v-if="isSearchActive"
        class="border-t border-slate-200/70 bg-white/65 p-2 dark:border-white/10 dark:bg-black/10"
      >
        <div v-if="visibleResults.length" class="grid gap-2">
          <NuxtLink
            v-for="result in visibleResults"
            :key="result.key"
            :to="result.path"
            class="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 dark:hover:bg-white/10 dark:focus:ring-cyan-200"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 dark:ring-white/10"
              :class="result.iconClass"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in result.iconPaths"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>

            <span class="min-w-0 flex-1">
              <span
                class="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"
              >
                <span class="truncate">{{ result.title }}</span>
                <span
                  class="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700 dark:bg-cyan-300/15 dark:text-cyan-200"
                >
                  {{ result.label }}
                </span>
              </span>
              <span
                class="mt-0.5 block truncate text-xs text-slate-500 dark:text-white/55"
              >
                {{ result.description }}
              </span>
            </span>

            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-sky-600 dark:text-white/35 dark:group-hover:text-cyan-200"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </NuxtLink>
        </div>

        <p
          v-else
          class="px-3 py-4 text-sm font-semibold text-slate-500 dark:text-white/55"
        >
          {{ copy.heroSearch.noResults }}
        </p>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <span class="text-xs font-semibold text-slate-500 dark:text-white/50">
        {{ copy.heroSearch.examplesLabel }}
      </span>
      <button
        v-for="example in copy.heroSearch.examples"
        :key="example"
        type="button"
        class="rounded-full border border-sky-100 bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm shadow-sky-100/40 transition hover:-translate-y-0.5 hover:border-sky-200 hover:bg-white hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/65 dark:shadow-black/20 dark:hover:bg-white/[0.11] dark:hover:text-white dark:focus:ring-cyan-200"
        @click="searchExample(example)"
      >
        {{ example }}
      </button>
    </div>
  </div>
</template>
