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
  iconPath?: string;
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
      iconPath: tool.iconPath,
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
      iconPath: guide.iconPath,
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

function openTopResult() {
  if (!topResult.value) {
    return;
  }

  navigateTo(topResult.value.path);
}
</script>

<template>
  <div class="w-full min-w-0 text-left">
    <label
      for="home-global-search"
      class="mb-2 block text-sm font-bold text-slate-900 dark:text-white"
    >
      {{ copy.heroSearch.label }}
    </label>

    <div
      class="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-[0_20px_60px_rgba(14,165,233,0.18)] backdrop-blur-xl dark:border-white/12 dark:bg-white/[0.07] dark:shadow-black/25"
    >
      <div class="relative">
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-600 dark:text-cyan-300 sm:left-5"
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
          class="h-12 w-full min-w-0 bg-transparent pl-12 pr-12 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400 sm:pl-14 sm:pr-14 sm:text-base dark:text-white dark:placeholder:text-white/35"
          :placeholder="copy.heroSearch.placeholder"
          @keydown.enter.prevent="openTopResult"
          @keydown.esc="clearSearch"
          @search="handleNativeSearch"
        />

        <button
          v-if="globalSearch"
          type="button"
          class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:right-3 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-200"
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
            class="group flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2.5 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-300 sm:gap-3 sm:px-3 dark:hover:bg-white/10 dark:focus:ring-cyan-200"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5 sm:h-11 sm:w-11 dark:ring-white/10"
              :class="
                result.iconPath
                  ? 'bg-white/80 dark:bg-white/[0.08]'
                  : result.iconClass
              "
              aria-hidden="true"
            >
              <img
                v-if="result.iconPath"
                :src="result.iconPath"
                alt=""
                aria-hidden="true"
                class="h-9 w-9 rounded-xl object-contain sm:h-10 sm:w-10"
                decoding="async"
              />
              <svg
                v-else
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
                class="flex min-w-0 flex-col items-start gap-1 text-sm font-black text-slate-950 sm:flex-row sm:items-center sm:gap-2 dark:text-white"
              >
                <span class="max-w-full truncate">{{ result.title }}</span>
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
  </div>
</template>
