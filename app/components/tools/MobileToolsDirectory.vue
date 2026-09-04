<script setup lang="ts">
import { ArrowRight, Moon, Sparkles, Sun, Wrench } from "lucide-vue-next";
import HomeGlobalSearch from "~/components/landing/HomeGlobalSearch.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import MobileToolDirectoryCard from "~/components/tools/MobileToolDirectoryCard.vue";
import type { ToolDirectoryCategory } from "~/data/tool-categories";
import type { LandingTool } from "~/data/tools";
import { getToolIconTone } from "~/lib/tool-icon-tones";

type MobileDirectoryCategory = ToolDirectoryCategory & {
  count: number;
};

const props = defineProps<{
  tools: LandingTool[];
  categories: MobileDirectoryCategory[];
}>();

const { user, isReady } = useAuth();
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const selectedCategoryKey = ref("");
const avatarFailed = ref(false);

const visibleUser = computed(() => isReady.value ? user.value : null);
const selectedCategory = computed(() =>
  props.categories.find((category) => category.key === selectedCategoryKey.value) ?? null,
);
const visibleTools = computed(() => {
  if (!selectedCategory.value) return props.tools;
  const toolKeys = new Set(selectedCategory.value.toolKeys);
  return props.tools.filter((tool) => toolKeys.has(tool.key));
});
const userInitials = computed(() => {
  const source = visibleUser.value?.name || visibleUser.value?.email || "A";
  return source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "A";
});

function selectCategory(key: string) {
  selectedCategoryKey.value = selectedCategoryKey.value === key ? "" : key;
}

watch(() => visibleUser.value?.avatarUrl, () => {
  avatarFailed.value = false;
});
</script>

<template>
  <div class="min-w-0 pb-24">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-[#082552] dark:text-white">Explore tools</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/55">Find the right tool for your next task.</p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button type="button" class="mobile-pressable grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-[#082552] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" :aria-label="nextColorModeLabel" :title="nextColorModeLabel" @click="toggleColorMode">
          <Sun v-if="isDark" class="size-5" aria-hidden="true" />
          <Moon v-else class="size-5" aria-hidden="true" />
        </button>
        <span v-if="!isReady" class="mobile-skeleton size-11 rounded-full" aria-hidden="true" />
        <NuxtLink v-else :to="visibleUser ? '/account' : '/login'" class="mobile-pressable grid size-11 place-items-center overflow-hidden rounded-full bg-[#082552] text-sm font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" :aria-label="visibleUser ? 'Open account' : 'Sign in'">
          <img v-if="visibleUser?.avatarUrl && !avatarFailed" :src="visibleUser.avatarUrl" alt="" class="size-full object-cover" referrerpolicy="no-referrer" @error="avatarFailed = true" />
          <span v-else aria-hidden="true">{{ userInitials }}</span>
        </NuxtLink>
      </div>
    </header>

    <NuxtLink
      to="/creator"
      class="mobile-pressable mt-5 flex min-h-20 items-center gap-3 rounded-2xl border border-violet-200 bg-white p-3.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-violet-300/20 dark:bg-white/[0.06]"
    >
      <span class="tool-icon-tone tool-icon-tone-violet grid size-11 shrink-0 place-items-center rounded-xl" aria-hidden="true"><Sparkles class="size-5" /></span>
      <span class="min-w-0 flex-1"><strong class="block text-sm text-[#082552] dark:text-white">ChlatWork Creator</strong><span class="mt-1 block truncate text-xs text-slate-500 dark:text-white/50">Posts, scripts, video AI, and Khmer writing</span></span>
      <ArrowRight class="size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
    </NuxtLink>

    <section class="mt-6" aria-label="Search tools">
      <HomeGlobalSearch input-id="mobile-tools-global-search" :tools="props.tools" />
    </section>

    <nav class="sidebar-scrollbar-hidden -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filter tools by category">
      <button type="button" class="mobile-pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" :class="selectedCategoryKey ? 'border border-slate-200 bg-white text-[#082552] dark:border-white/10 dark:bg-white/[0.05] dark:text-white' : 'bg-[#082552] text-white'" @click="selectedCategoryKey = ''">
        <Wrench class="size-4" aria-hidden="true" /> All
      </button>
      <button v-for="category in props.categories" :key="category.key" type="button" class="mobile-pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" :class="selectedCategoryKey === category.key ? 'border-[#082552] bg-[#082552] font-semibold text-white dark:border-white/20 dark:bg-white/[0.12] dark:text-white' : 'border-slate-200 bg-white text-[#082552] dark:border-white/10 dark:bg-white/[0.05] dark:text-white'" :aria-pressed="selectedCategoryKey === category.key" @click="selectCategory(category.key)">
        <span class="grid size-6 place-items-center rounded-lg" :class="selectedCategoryKey === category.key ? 'bg-white/15 text-white' : getToolIconTone(category.key)" aria-hidden="true"><ToolIcon :name="category.key" class="size-4" /></span>
        {{ category.shortTitle }}
      </button>
    </nav>

    <section class="mt-7" aria-labelledby="mobile-tools-results-title">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 id="mobile-tools-results-title" class="text-lg font-semibold text-[#082552] dark:text-white">{{ selectedCategory?.shortTitle || 'All tools' }}</h2>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/45">{{ visibleTools.length }} {{ visibleTools.length === 1 ? 'tool' : 'tools' }}</p>
        </div>
        <button v-if="selectedCategoryKey" type="button" class="min-h-10 text-xs font-semibold text-[#082552] dark:text-cyan-300" @click="selectedCategoryKey = ''">Clear filter</button>
      </div>
      <TransitionGroup name="mobile-grid" tag="ul" class="relative mt-3 grid grid-cols-2 gap-2" aria-label="Available tools">
        <li v-for="tool in visibleTools" :key="tool.key" class="min-w-0">
          <MobileToolDirectoryCard :tool="tool" />
        </li>
      </TransitionGroup>
    </section>

  </div>
</template>
