<script setup lang="ts">
import type { LandingTool } from "~/data/tools";
import { filterTools } from "~/lib/tool-search";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import { getToolIconTone } from "~/lib/tool-icon-tones";

const props = withDefaults(defineProps<{
  tools: LandingTool[];
  inputId?: string;
}>(), {
  inputId: "home-global-search",
});

type SearchResult = {
  key: string;
  title: string;
  description: string;
  path: string;
};

const { copy } = useLanguage();
const globalSearch = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const isSearchActive = computed(() => globalSearch.value.trim().length > 0);

const toolResults = computed<SearchResult[]>(() =>
  filterTools(props.tools, globalSearch.value)
    .slice(0, 5)
    .map((tool) => ({
      key: tool.key,
      title: tool.name,
      description: tool.description,
      path: tool.route,
    })),
);

const visibleResults = computed(() =>
  isSearchActive.value ? toolResults.value : [],
);
const topResult = computed(() => visibleResults.value[0] ?? null);

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
    <div
      class="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm transition focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-200 dark:border-white/15 dark:bg-white/[0.06] dark:focus-within:border-cyan-300 dark:focus-within:ring-cyan-300/15"
    >
      <div class="relative flex min-w-0 items-center">
        <svg
          viewBox="0 0 24 24"
          class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 dark:text-white/55 sm:left-5"
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
          :id="props.inputId"
          ref="searchInput"
          v-model="globalSearch"
          type="search"
          :aria-label="copy.heroSearch.label"
          class="h-14 min-w-0 flex-1 bg-transparent pl-12 pr-12 text-sm font-medium text-slate-950 outline-none placeholder:text-slate-500 sm:pl-14 sm:text-base dark:text-white dark:placeholder:text-white/40"
          :placeholder="copy.heroSearch.placeholder"
          @keydown.enter.prevent="openTopResult"
          @keydown.esc="clearSearch"
          @search="handleNativeSearch"
        />

        <button
          v-if="globalSearch"
          type="button"
          class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white dark:focus:ring-cyan-200"
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
        class="border-t border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-black/10"
      >
        <div v-if="visibleResults.length" class="grid gap-2">
          <NuxtLink
            v-for="result in visibleResults"
            :key="result.key"
            :to="result.path"
            class="group flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:gap-3 sm:px-3 dark:hover:bg-white/10 dark:focus:ring-cyan-200"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors sm:h-11 sm:w-11"
              :class="getToolIconTone(result.key)"
              aria-hidden="true"
            >
              <ToolIcon :name="result.key" class="h-5 w-5" />
            </span>

            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                {{ result.title }}
              </span>
              <span
                class="mt-0.5 block truncate text-xs text-slate-500 dark:text-white/55"
              >
                {{ result.description }}
              </span>
            </span>

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
