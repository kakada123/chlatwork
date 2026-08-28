<script setup lang="ts">
import {
  Heart,
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

type FeaturedHomeItem = Pick<
  LandingTool,
  "key" | "name" | "route" | "description"
> & {
  ctaLabel: string;
  kind: "tool" | "moment";
};

const MOMENTS_FEATURED_ITEM: FeaturedHomeItem = {
  key: "create-moment",
  name: "Create a Moment",
  route: "/moments/create",
  description:
    "Turn photos and your words into a private page for someone special.",
  ctaLabel: "Create now",
  kind: "moment",
};

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
const recentToolsLoading = ref(false);
let loadedUsageForUserId = "";
let mobileViewportQuery: MediaQueryList | null = null;

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
// Moments remains the single focused campaign instead of competing in an auto-rotating tool carousel.
const featuredItem = MOMENTS_FEATURED_ITEM;
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

  if (!isMobileViewport.value || !activeUserId) {
    recentToolsLoading.value = false;
    if (!activeUserId) {
      loadedUsageForUserId = "";
      usageSummary.value = [];
    }
    return;
  }

  if (loadedUsageForUserId === activeUserId) {
    return;
  }

  loadedUsageForUserId = activeUserId;
  recentToolsLoading.value = true;
  try {
    usageSummary.value = await getToolUsageSummary();
  } catch {
    // Recent activity is optional; favorites and popular tools keep the dashboard useful offline.
    usageSummary.value = [];
  } finally {
    recentToolsLoading.value = false;
  }
}

function handleAvatarError() {
  avatarFailed.value = true;
}

function handleViewportChange() {
  isMobileViewport.value = mobileViewportQuery?.matches ?? false;
}

onMounted(() => {
  mobileViewportQuery = window.matchMedia("(max-width: 639px)");
  isMobileViewport.value = mobileViewportQuery.matches;
  const hour = new Date().getHours();
  greeting.value = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  mobileViewportQuery.addEventListener("change", handleViewportChange);
  void loadRecentTools();
});

onBeforeUnmount(() => {
  mobileViewportQuery?.removeEventListener("change", handleViewportChange);
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
          class="mobile-pressable grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
          :aria-label="nextColorModeLabel"
          :title="nextColorModeLabel"
          @click="toggleColorMode"
        >
          <Sun v-if="isDark" class="size-5" aria-hidden="true" />
          <Moon v-else class="size-5" aria-hidden="true" />
        </button>

        <span
          v-if="!isReady"
          class="mobile-skeleton size-11 rounded-full"
          aria-hidden="true"
        />
        <NuxtLink
          v-else
          :to="visibleUser ? '/account' : '/login'"
          class="mobile-pressable grid size-11 place-items-center overflow-hidden rounded-full bg-[#082552] text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
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
        class="mobile-pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[#082552] px-4 text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <Shapes class="size-4" aria-hidden="true" /> All
      </NuxtLink>
      <NuxtLink
        v-for="category in mobileCategories"
        :key="category.key"
        :to="category.route"
        class="mobile-pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
      >
        <span class="grid size-6 place-items-center rounded-lg" :class="getToolIconTone(category.key)" aria-hidden="true">
          <ToolIcon :name="category.key" class="size-4" />
        </span>
        {{ categoryLabel(category) }}
      </NuxtLink>
    </nav>

    <section
      class="relative mt-6 overflow-hidden rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-amber-50 px-5 py-5 shadow-sm dark:border-rose-300/15 dark:from-rose-400/10 dark:via-white/[0.04] dark:to-amber-300/10"
      aria-labelledby="mobile-featured-item-title"
    >
      <div
        class="absolute right-1 top-3 size-24 opacity-20 [background-image:radial-gradient(#e11d48_1.5px,transparent_1.5px)] [background-size:10px_10px]"
        aria-hidden="true"
      />
      <div class="relative z-10">
        <div class="max-w-[58%]">
          <p class="inline-flex rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-300/15 dark:text-rose-200">
            Featured
          </p>
          <h2 id="mobile-featured-item-title" class="mt-3 line-clamp-2 h-14 text-2xl font-semibold leading-7 text-[#082552] dark:text-white">
            {{ featuredItem.name }}
          </h2>
          <p class="mt-2 line-clamp-2 h-10 text-sm leading-5 text-slate-600 dark:text-white/60">
            {{ featuredItem.description }}
          </p>
          <NuxtLink
            :to="featuredItem.route"
            class="mobile-pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            {{ featuredItem.ctaLabel }} <span aria-hidden="true">→</span>
          </NuxtLink>
        </div>
        <div
          class="absolute right-0 top-1/2 grid size-20 -translate-y-1/2 place-items-center rounded-2xl bg-white text-rose-600 shadow-xl dark:bg-slate-950 dark:text-rose-300"
          aria-hidden="true"
        >
          <Heart class="size-12 fill-current" />
        </div>
      </div>
    </section>

    <section
      v-if="recentToolsLoading"
      class="mt-7"
      aria-label="Loading recent tools"
    >
      <div class="flex items-center justify-between gap-3" aria-hidden="true">
        <div class="mobile-skeleton h-5 w-48 rounded-md" />
        <div class="mobile-skeleton h-3 w-12 rounded-full" />
      </div>
      <div class="-mx-4 mt-3 flex gap-2 overflow-hidden px-4" aria-hidden="true">
        <div v-for="index in 3" :key="index" class="w-32 shrink-0 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.05]">
          <div class="mobile-skeleton size-10 rounded-xl" />
          <div class="mobile-skeleton mt-3 h-4 w-20 rounded-md" />
          <div class="mobile-skeleton mt-2 h-4 w-16 rounded-md" />
          <div class="mobile-skeleton mt-5 h-3 w-12 rounded-md" />
        </div>
      </div>
    </section>

    <section
      v-else-if="recentTools.length"
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
      <ul class="mobile-stagger-list sidebar-scrollbar-hidden -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Recently used tools">
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
      <ul class="mobile-stagger-list sidebar-scrollbar-hidden -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Favorite tools">
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
      <ul class="mobile-stagger-list mt-3 grid grid-cols-4 gap-2" aria-label="Popular tools">
        <li v-for="tool in visiblePopularTools" :key="tool.key">
          <MobileHomeToolCard :tool="tool" />
        </li>
      </ul>
    </section>

  </div>
</template>
