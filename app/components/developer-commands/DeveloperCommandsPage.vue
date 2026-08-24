<script setup lang="ts">
import { DEVELOPER_COMMANDS, DEVELOPER_COMMAND_CATEGORIES } from "~/data/developer-commands";
import type { CommandPlatform } from "~/types/developer-command";
import CommandCard from "~/components/developer-commands/CommandCard.vue";
import CommandQuickCard from "~/components/developer-commands/CommandQuickCard.vue";
import CommandSearch from "~/components/developer-commands/CommandSearch.vue";
import PlatformFilter from "~/components/developer-commands/PlatformFilter.vue";
import CommandCategoryIcon from "~/components/developer-commands/CommandCategoryIcon.vue";
import { DEVELOPER_GUIDES } from "~/data/developer-guides";

const RECENTS_KEY = "chlatwork_developer_command_recents";
const search = ref("");
const category = ref("All");
const platform = ref<"all" | CommandPlatform>("all");
const favoritesOnly = ref(false);
const viewMode = ref<"quick" | "detailed">("quick");
const { favoriteCommandIds: favorites, toggleCommandFavorite: toggleFavorite } = useCommandFavorites();
const recentIds = ref<string[]>([]);
const copyNotice = ref(false);
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
const SEARCH_ALIASES: Record<string, string[]> = {
  undo: ["revert", "reset", "restore"],
  create: ["new", "generate", "make"],
  check: ["status", "show", "find", "test"],
  remove: ["delete", "rm", "prune"],
  delete: ["remove", "rm", "prune"],
  restart: ["reload"],
  postgres: ["postgresql", "psql", "pg"],
};

const counts = computed(() => ({
  All: DEVELOPER_COMMANDS.length,
  ...Object.fromEntries(DEVELOPER_COMMAND_CATEGORIES.map((item) => [item, DEVELOPER_COMMANDS.filter((entry) => entry.category === item).length])),
}));

const commandsInCurrentCategory = computed(() => DEVELOPER_COMMANDS.filter((item) => category.value === "All" || item.category === category.value));
const platformCounts = computed<Record<CommandPlatform, number>>(() => ({
  macos: commandsInCurrentCategory.value.filter((item) => item.platform?.includes("macos")).length,
  linux: commandsInCurrentCategory.value.filter((item) => item.platform?.includes("linux")).length,
  windows: commandsInCurrentCategory.value.filter((item) => item.platform?.includes("windows")).length,
}));
const hasPlatformVariants = computed(() => Object.values(platformCounts.value).some((count) => count > 0));
const crossPlatformCount = computed(() => filteredCommands.value.filter((item) => !item.platform).length);

const filteredCommands = computed(() => {
  const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return DEVELOPER_COMMANDS.map((item) => {
    if (category.value !== "All" && item.category !== category.value) return false;
    if (platform.value !== "all" && item.platform && !item.platform.includes(platform.value)) return false;
    if (favoritesOnly.value && !favorites.value.includes(item.id)) return false;
    const haystack = [item.title, item.description, item.command, item.category, ...item.keywords].join(" ").toLowerCase();
    const matchedTerms = terms.filter((term) => [term, ...(SEARCH_ALIASES[term] ?? [])].some((candidate) => haystack.includes(candidate)));
    if (terms.length && matchedTerms.length < Math.ceil(terms.length * 0.6)) return false;
    const exactTitle = search.value && item.title.toLowerCase().includes(search.value.toLowerCase().trim()) ? 20 : 0;
    const platformPriority = platform.value !== "all" && item.platform?.includes(platform.value) ? 10 : 0;
    return { item, score: exactTitle + matchedTerms.length * 4 + Number(favorites.value.includes(item.id)) * 2 + platformPriority };
  }).filter((entry): entry is { item: (typeof DEVELOPER_COMMANDS)[number]; score: number } => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map((entry) => entry.item);
});

const isCategoryOverview = computed(() => category.value === "All" && !search.value.trim() && !favoritesOnly.value);
const visibleCommands = computed(() => {
  if (category.value !== "All") return filteredCommands.value;
  return filteredCommands.value.slice(0, 12);
});

onMounted(() => {
  recentIds.value = readStoredIds(RECENTS_KEY);
});

onBeforeUnmount(() => noticeTimer && clearTimeout(noticeTimer));

watch(category, () => {
  platform.value = "all";
});

function readStoredIds(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && DEVELOPER_COMMANDS.some((item) => item.id === id)) : [];
  } catch {
    return [];
  }
}

function recordCopy(id: string) {
  // Only command definition IDs are persisted; customized values may contain sensitive hostnames or paths.
  recentIds.value = [id, ...recentIds.value.filter((item) => item !== id)].slice(0, 5);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recentIds.value));
  copyNotice.value = true;
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => (copyNotice.value = false), 1400);
}
</script>

<template>
  <main class="mx-auto w-full max-w-[1440px] space-y-4 text-slate-900 dark:text-slate-100">
    <header class="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
      <div class="shrink-0">
        <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-cyan-300">Command Hub</p>
        <h1 class="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">Developer Commands</h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Find, customize, and copy common developer commands.</p>
      </div>
      <div class="w-full lg:max-w-3xl">
        <CommandSearch v-model="search" />
      </div>
    </header>

    <section v-if="isCategoryOverview" class="overflow-hidden rounded-[22px] border border-slate-200 bg-white/80 shadow-sm dark:border-slate-700 dark:bg-slate-900/90" aria-labelledby="production-guides-title">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div>
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 dark:text-cyan-300">First release</p>
          <h2 id="production-guides-title" class="text-sm font-black text-slate-950 dark:text-white">Production guides</h2>
        </div>
        <NuxtLink to="/developer-guides" class="text-xs font-bold text-sky-700 hover:underline dark:text-cyan-300">View all guides →</NuxtLink>
      </div>
      <div class="grid sm:grid-cols-2 xl:grid-cols-5">
        <NuxtLink v-for="(guide, index) in DEVELOPER_GUIDES" :key="guide.slug" :to="guide.path" class="group flex min-w-0 items-center gap-3 border-b border-slate-100 px-4 py-3 transition hover:bg-sky-50 sm:[&:nth-last-child(-n+1)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0 dark:border-slate-800 dark:hover:bg-white/[0.06]">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-cyan-400/15 dark:group-hover:text-cyan-300">{{ index + 1 }}</span>
          <span class="min-w-0">
            <span class="line-clamp-2 block text-xs font-black leading-4 text-slate-800 group-hover:text-sky-700 dark:text-slate-100 dark:group-hover:text-cyan-300">{{ guide.title }}</span>
            <span class="mt-0.5 block text-[10px] font-semibold text-slate-400 dark:text-slate-500">{{ guide.duration }}</span>
          </span>
        </NuxtLink>
      </div>
    </section>

    <section class="space-y-4 rounded-[22px] border border-white/80 bg-white/70 p-4 shadow-lg shadow-sky-100/50 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:shadow-black/30">
      <div v-if="category === 'All' && !search.trim()" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <button v-for="item in DEVELOPER_COMMAND_CATEGORIES" :key="item" type="button" class="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 text-left transition hover:border-sky-300 hover:bg-sky-50/60 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-cyan-500/60 dark:hover:bg-white/[0.08]" @click="category = item">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-700 transition group-hover:border-sky-200 group-hover:bg-sky-100 group-hover:text-sky-800 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-700 dark:group-hover:border-cyan-300 dark:group-hover:bg-white dark:group-hover:text-slate-900"><CommandCategoryIcon :category="item" /></span>
          <span class="min-w-0">
            <span class="block truncate text-sm font-black text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-cyan-300">{{ item }}</span>
            <span class="mt-0.5 block text-xs font-semibold text-slate-400 dark:text-slate-500">{{ counts[item] }} commands</span>
          </span>
        </button>
      </div>

      <div v-else class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2 text-sm">
          <button type="button" class="shrink-0 rounded-lg px-2 py-1.5 font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-sky-700 dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-cyan-300" @click="category = 'All'; search = ''">← Categories</button>
          <span class="h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          <span v-if="category !== 'All'" class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-100 dark:text-slate-700"><CommandCategoryIcon :category="category" /></span>
          <h2 class="truncate font-black text-slate-950 dark:text-white">{{ category === 'All' ? 'Search results' : category }}</h2>
          <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-white/[0.08] dark:text-slate-400">{{ filteredCommands.length }}</span>
        </div>
      </div>

      <div v-if="!isCategoryOverview" class="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div v-if="hasPlatformVariants">
          <PlatformFilter v-model="platform" :counts="platformCounts" />
          <p v-if="platform !== 'all'" class="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            {{ platformCounts[platform] }} {{ platform }}-specific first · {{ crossPlatformCount }} cross-platform included
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-950/70" aria-label="Command display mode">
            <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-bold" :class="viewMode === 'quick' ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'" :aria-pressed="viewMode === 'quick'" @click="viewMode = 'quick'">Quick view</button>
            <button type="button" class="rounded-lg px-3 py-1.5 text-xs font-bold" :class="viewMode === 'detailed' ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950' : 'text-slate-500 dark:text-slate-400'" :aria-pressed="viewMode === 'detailed'" @click="viewMode = 'detailed'">Detailed</button>
          </div>
          <button type="button" class="h-10 rounded-xl border px-3 text-sm font-bold transition" :class="favoritesOnly ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-400/60 dark:bg-amber-400/15 dark:text-amber-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300 dark:hover:border-slate-500'" :aria-pressed="favoritesOnly" @click="favoritesOnly = !favoritesOnly">★ Favorites {{ favorites.length ? `(${favorites.length})` : "" }}</button>
        </div>
      </div>
    </section>

    <div v-if="!isCategoryOverview" id="command-results" class="flex scroll-mt-24 items-center justify-between gap-4">
      <p class="text-sm font-semibold text-slate-500 dark:text-white/50">{{ filteredCommands.length }} matching commands</p>
      <p v-if="category !== 'All' || platform !== 'all' || favoritesOnly" class="text-xs text-slate-400 dark:text-slate-500">Filters are active</p>
    </div>

    <section v-if="!isCategoryOverview && filteredCommands.length" class="grid items-start gap-2" :class="viewMode === 'quick' ? 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'" aria-live="polite">
      <template v-if="viewMode === 'quick'">
        <CommandQuickCard v-for="item in visibleCommands" :key="item.id" :item="item" :favorite="favorites.includes(item.id)" @favorite="toggleFavorite(item.id)" @copied="recordCopy(item.id)" />
      </template>
      <template v-else>
        <CommandCard v-for="item in visibleCommands" :key="item.id" :item="item" :favorite="favorites.includes(item.id)" @favorite="toggleFavorite(item.id)" @copied="recordCopy(item.id)" />
      </template>
    </section>
    <section v-else-if="!isCategoryOverview" class="rounded-[22px] border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/80">
      <h2 class="font-black text-slate-900 dark:text-white">No matching commands</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-white/50">Try fewer search words or clear a category, platform, or favorites filter.</p>
    </section>

    <div v-if="copyNotice" role="status" class="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl dark:bg-white dark:text-slate-950">Copied!</div>
  </main>
</template>
