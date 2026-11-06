<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import HomeGlobalSearch from "./HomeGlobalSearch.vue";
import HomeToolCard from "./HomeToolCard.vue";
import type { LandingTool } from "~/data/tools";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();

const props = defineProps<{
  tools: LandingTool[];
  popularTools: LandingTool[];
}>();

const { favoriteToolKeys, favoritesReady } = useToolFavorites();
// The homepage is a starting point; the complete catalogue remains in the tools directory.
const visiblePopularTools = computed(() => props.popularTools.slice(0, 6));
const favoriteTools = computed(() =>
  favoriteToolKeys.value
    .map((key) => props.tools.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool))
    .slice(0, 3),
);
</script>

<template>
  <section class="text-slate-950 dark:text-white" aria-labelledby="popular-tools-title">
    <div class="mx-auto">
      <h1 class="sr-only">{{ t("shared.components_landing_hero_section.free_online_tools_for_everyday_work") }}</h1>
      <div class="mx-auto max-w-3xl">
        <HomeGlobalSearch :tools="props.tools" />
      </div>

      <section v-if="favoritesReady && favoriteTools.length" class="mt-10" aria-labelledby="your-tools-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="your-tools-title" class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {{ t("shared.components_landing_hero_section.your_tools") }}
          </h2>
          <NuxtLink to="/account#favorite-tools" class="text-sm font-semibold text-sky-700 hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-cyan-300">
            {{ t("shared.components_landing_hero_section.view_in_profile") }}
          </NuxtLink>
        </div>
        <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :aria-label="t(&quot;shared.components_landing_hero_section.your_favorite_tools&quot;)">
          <li v-for="tool in favoriteTools" :key="tool.key">
            <HomeToolCard :tool="tool" />
          </li>
        </ul>
      </section>

      <div class="mt-10 flex items-center justify-between gap-3">
        <h2
          id="popular-tools-title"
          class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white"
        >
          {{ t("shared.components_landing_hero_section.start_with_a_popular_tool") }}
        </h2>
        <NuxtLink
          to="/tools"
          class="text-sm font-semibold text-sky-700 transition hover:text-sky-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-cyan-300 dark:hover:text-cyan-100"
        >
          {{ t("shared.components_landing_hero_section.view_all_tools") }}
        </NuxtLink>
      </div>

      <ul class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" :aria-label="t(&quot;shared.components_landing_hero_section.popular_tools&quot;)">
        <li
          v-for="tool in visiblePopularTools"
          :key="tool.key"
        >
          <HomeToolCard :tool="tool" />
        </li>
      </ul>
    </div>
  </section>
</template>
