<script setup lang="ts">
import {
  Moon,
  Shapes,
  Sun,
} from "lucide-vue-next";
import HomeGlobalSearch from "./HomeGlobalSearch.vue";
import MobileHomeToolCard from "./MobileHomeToolCard.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import type { ToolUsageSummaryItem } from "~/composables/useToolUsage";
import type { LandingTool, LandingToolCategory } from "~/data/tools";
import { getToolIconTone } from "~/lib/tool-icon-tones";

type RecentTool = {
  tool: LandingTool;
  lastUsedAt: string | null;
};

const FEATURED_TOOL_KEYS = [
  "qr",
  "merge-pdf",
  "image-compress",
  "payback-calculator",
] as const;
const FEATURED_ROTATION_INTERVAL_MS = 6_000;

const props = defineProps<{
  tools: LandingTool[];
  popularTools: LandingTool[];
  categories: LandingToolCategory[];
}>();

const { user, isReady } = useAuth();
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const { favoriteToolKeys, favoritesReady } = useToolFavorites();
const { getToolUsageSummary } = useToolUsage();
const greeting = ref("Welcome");
const avatarFailed = ref(false);
const isMobileViewport = ref(false);
const usageSummary = ref<ToolUsageSummaryItem[]>([]);
const featuredIndex = ref(0);
let loadedUsageForUserId = "";
let featuredRotationTimer: ReturnType<typeof setInterval> | null = null;
let mobileViewportQuery: MediaQueryList | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

const visibleUser = computed(() => isReady.value ? user.value : null);
const firstName = computed(() => visibleUser.value?.name?.trim().split(/\s+/)[0] ?? "");
const greetingLine = computed(() =>
  firstName.value
    ? `${greeting.value}, ${firstName.value}! 👋`
    : `${greeting.value}! 👋`,
);
const userInitials = computed(() => {
  const source = visibleUser.value?.name
    || visibleUser.value?.email
    || "A";

  return source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "A";
});
const visiblePopularTools = computed(() => props.popularTools.slice(0, 8));
const mobileCategories = computed(() => {
  const order = ["pdf", "image", "calculators", "developer-tools", "khmer-tools"];

  return order
    .map((key) => props.categories.find((category) => category.key === key))
    .filter((category): category is LandingToolCategory => Boolean(category));
});
const featuredTools = computed(() =>
  FEATURED_TOOL_KEYS
    .map((key) => props.tools.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool)),
);
const featuredTool = computed(() =>
  featuredTools.value[featuredIndex.value % featuredTools.value.length]
    ?? props.popularTools[0],
);
const recentTools = computed<RecentTool[]>(() =>
  usageSummary.value
    .map((usage) => ({
      tool: props.tools.find((tool) => tool.key === usage.toolKey),
      lastUsedAt: usage.lastUsedAt,
    }))
    .filter((item): item is { tool: LandingTool; lastUsedAt: string } => Boolean(item.tool))
    .slice(0, 5),
);
const favoriteTools = computed<RecentTool[]>(() =>
  favoriteToolKeys.value
    .map((key) => props.tools.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool))
    .slice(0, 5)
    .map((tool) => ({ tool, lastUsedAt: null })),
);
function categoryLabel(category: LandingToolCategory) {
  if (category.key === "calculators") return "Utilities";
  if (category.key === "developer-tools") return "Developer";
  if (category.key === "khmer-tools") return "Khmer";
  return category.name;
}

function formatRecentTime(value: string | null) {
  if (!value) return "Saved";

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Recently";

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "Yesterday" : `${elapsedDays}d ago`;
}

async function loadRecentTools() {
  const activeUserId = visibleUser.value?.id;

  if (!isMobileViewport.value || !activeUserId || loadedUsageForUserId === activeUserId) {
    return;
  }

  loadedUsageForUserId = activeUserId;
  try {
    usageSummary.value = await getToolUsageSummary();
  } catch {
    // Recent activity is optional; favorites and popular tools keep the dashboard useful offline.
    usageSummary.value = [];
  }
}

function handleAvatarError() {
  avatarFailed.value = true;
}

function stopFeaturedRotation() {
  if (featuredRotationTimer) {
    clearInterval(featuredRotationTimer);
    featuredRotationTimer = null;
  }
}

function startFeaturedRotation() {
  stopFeaturedRotation();

  if (
    !isMobileViewport.value
    || document.hidden
    || reducedMotionQuery?.matches
    || featuredTools.value.length < 2
  ) {
    return;
  }

  featuredRotationTimer = setInterval(() => {
    featuredIndex.value = (featuredIndex.value + 1) % featuredTools.value.length;
  }, FEATURED_ROTATION_INTERVAL_MS);
}

function selectFeaturedTool(index: number) {
  featuredIndex.value = index;
  // Restarting gives the selected slide a full reading interval before it advances.
  startFeaturedRotation();
}

function handleViewportChange() {
  isMobileViewport.value = mobileViewportQuery?.matches ?? false;
  startFeaturedRotation();
}

function handleRotationPreferenceChange() {
  startFeaturedRotation();
}

onMounted(() => {
  mobileViewportQuery = window.matchMedia("(max-width: 639px)");
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  isMobileViewport.value = mobileViewportQuery.matches;
  const hour = new Date().getHours();
  greeting.value = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  mobileViewportQuery.addEventListener("change", handleViewportChange);
  reducedMotionQuery.addEventListener("change", handleRotationPreferenceChange);
  document.addEventListener("visibilitychange", handleRotationPreferenceChange);
  startFeaturedRotation();
  void loadRecentTools();
});

onBeforeUnmount(() => {
  stopFeaturedRotation();
  mobileViewportQuery?.removeEventListener("change", handleViewportChange);
  reducedMotionQuery?.removeEventListener("change", handleRotationPreferenceChange);
  document.removeEventListener("visibilitychange", handleRotationPreferenceChange);
});

watch([isMobileViewport, isReady, user], () => {
  void loadRecentTools();
});

watch(() => visibleUser.value?.avatarUrl, () => {
  avatarFailed.value = false;
});
</script>

<template>
  <div class="min-w-0">
    <header class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="truncate text-3xl font-semibold tracking-tight text-[#082552] dark:text-white">
          ChlatWork
        </h1>
        <p class="mt-1 truncate text-sm text-slate-500 dark:text-white/55">
          {{ greetingLine }}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          :aria-label="nextColorModeLabel"
          :title="nextColorModeLabel"
          @click="toggleColorMode"
        >
          <Sun v-if="isDark" class="size-5" aria-hidden="true" />
          <Moon v-else class="size-5" aria-hidden="true" />
        </button>

        <NuxtLink
          :to="visibleUser ? '/account' : '/login'"
          class="grid size-11 place-items-center overflow-hidden rounded-full bg-[#082552] text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="visibleUser ? 'Open account' : 'Sign in'"
        >
          <img
            v-if="visibleUser?.avatarUrl && !avatarFailed"
            :src="visibleUser.avatarUrl"
            alt=""
            class="size-full object-cover"
            referrerpolicy="no-referrer"
            @error="handleAvatarError"
          />
          <span v-else aria-hidden="true">{{ userInitials }}</span>
        </NuxtLink>
      </div>
    </header>

    <section class="mt-6" aria-label="Find a ChlatWork tool">
      <HomeGlobalSearch input-id="mobile-home-global-search" :tools="props.tools" />
    </section>

    <nav
      class="sidebar-scrollbar-hidden -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1"
      aria-label="Mobile tool categories"
    >
      <NuxtLink
        to="/tools"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#082552] px-4 text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <Shapes class="size-4" aria-hidden="true" /> All
      </NuxtLink>
      <NuxtLink
        v-for="category in mobileCategories"
        :key="category.key"
        :to="category.route"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      >
        <span class="grid size-6 place-items-center rounded-lg" :class="getToolIconTone(category.key)" aria-hidden="true">
          <ToolIcon :name="category.key" class="size-4" />
        </span>
        {{ categoryLabel(category) }}
      </NuxtLink>
    </nav>

    <section
      v-if="featuredTool"
      class="relative mt-6 overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 px-5 pb-12 pt-5 shadow-sm dark:border-cyan-300/15 dark:from-cyan-400/10 dark:via-white/[0.04] dark:to-blue-400/10"
      aria-labelledby="mobile-featured-tool-title"
      aria-roledescription="carousel"
    >
      <div class="absolute right-1 top-3 size-24 opacity-20 [background-image:radial-gradient(#1d4ed8_1.5px,transparent_1.5px)] [background-size:10px_10px]" aria-hidden="true" />
      <Transition name="featured-tool" mode="out-in">
        <div :key="featuredTool.key" class="relative z-10">
          <div class="max-w-[58%]">
            <p class="inline-flex rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-300/15 dark:text-blue-200">
              Featured
            </p>
            <h2 id="mobile-featured-tool-title" class="mt-3 line-clamp-2 h-14 text-2xl font-semibold leading-7 text-[#082552] dark:text-white">
              {{ featuredTool.name }}
            </h2>
            <p class="mt-2 line-clamp-2 h-10 text-sm leading-5 text-slate-600 dark:text-white/60">
              {{ featuredTool.description }}
            </p>
            <NuxtLink
              :to="featuredTool.route"
              class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#082552] px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              Try it now <span aria-hidden="true">→</span>
            </NuxtLink>
          </div>
          <div class="absolute right-0 top-1/2 grid size-20 -translate-y-1/2 place-items-center rounded-2xl bg-white text-blue-700 shadow-xl dark:bg-slate-950 dark:text-cyan-300" aria-hidden="true">
            <ToolIcon :name="featuredTool.key" class="size-12" />
          </div>
        </div>
      </Transition>

      <div class="absolute inset-x-0 bottom-2 z-20 flex justify-center" aria-label="Choose featured tool">
        <button
          v-for="(tool, index) in featuredTools"
          :key="tool.key"
          type="button"
          class="grid size-8 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="`Show ${tool.name}`"
          :aria-current="featuredIndex === index ? 'true' : undefined"
          @click="selectFeaturedTool(index)"
        >
          <span
            class="h-1.5 rounded-full transition-[width,background-color]"
            :class="featuredIndex === index
              ? 'w-4 bg-[#082552] dark:bg-cyan-300'
              : 'w-1.5 bg-slate-300 dark:bg-white/25'"
            aria-hidden="true"
          />
        </button>
      </div>
    </section>

    <section
      v-if="recentTools.length"
      class="mt-7"
      aria-labelledby="mobile-resume-tools-title"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 id="mobile-resume-tools-title" class="text-lg font-semibold tracking-tight text-[#082552] dark:text-white">
          Continue where you left off
        </h2>
        <NuxtLink to="/account" class="shrink-0 text-xs font-semibold text-[#082552] dark:text-cyan-300">
          View all →
        </NuxtLink>
      </div>
      <ul class="sidebar-scrollbar-hidden -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Recently used tools">
        <li v-for="item in recentTools" :key="item.tool.key" class="shrink-0">
          <MobileHomeToolCard
            :tool="item.tool"
            variant="recent"
            :meta="formatRecentTime(item.lastUsedAt)"
          />
        </li>
      </ul>
    </section>

    <section
      v-if="favoritesReady && favoriteTools.length"
      class="mt-7"
      aria-labelledby="mobile-favorite-tools-title"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 id="mobile-favorite-tools-title" class="text-lg font-semibold tracking-tight text-[#082552] dark:text-white">
          Favorite tools
        </h2>
        <NuxtLink to="/account" class="shrink-0 text-xs font-semibold text-[#082552] dark:text-cyan-300">
          Manage →
        </NuxtLink>
      </div>
      <ul class="sidebar-scrollbar-hidden -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Favorite tools">
        <li v-for="item in favoriteTools" :key="item.tool.key" class="shrink-0">
          <MobileHomeToolCard :tool="item.tool" variant="recent" meta="Saved" />
        </li>
      </ul>
    </section>

    <section class="mt-7" aria-labelledby="mobile-popular-tools-title">
      <div class="flex items-center justify-between gap-3">
        <h2 id="mobile-popular-tools-title" class="text-lg font-semibold tracking-tight text-[#082552] dark:text-white">
          Popular tools
        </h2>
        <NuxtLink to="/tools" class="text-xs font-semibold text-[#082552] dark:text-cyan-300">
          See all →
        </NuxtLink>
      </div>
      <ul class="mt-3 grid grid-cols-4 gap-2" aria-label="Popular tools">
        <li v-for="tool in visiblePopularTools" :key="tool.key">
          <MobileHomeToolCard :tool="tool" />
        </li>
      </ul>
    </section>

  </div>
</template>

<style scoped>
.featured-tool-enter-active,
.featured-tool-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.featured-tool-enter-from {
  opacity: 0;
  transform: translateX(0.75rem);
}

.featured-tool-leave-to {
  opacity: 0;
  transform: translateX(-0.75rem);
}

@media (prefers-reduced-motion: reduce) {
  .featured-tool-enter-active,
  .featured-tool-leave-active {
    transition: none;
  }
}
</style>
