<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import MobileLandingPage from "./MobileLandingPage.vue";

import {
  LANDING_CATEGORIES,
  LANDING_TOOLS,
  type LandingTool,
} from "~/data/tools";

const { t } = useAppI18n();

const POPULAR_TOOL_FALLBACK_KEYS = [
  "payback-calculator",
  "qr",
  "image-compress",
  "merge-pdf",
  "khmer-unicode-fixer",
  "expense-tracker",
  "image-to-pdf",
  "password-generator",
  "json-formatter",
  "scan-qr",
  "wifi-qr",
  "text-to-voice",
  "calculator",
  "barcode",
  "jwt-decoder",
  "base64",
] as const;
const POPULAR_TOOL_CARD_COUNT = 15;

const { isKhmer, localizeCategory, localizeTool } = useLanguage();
const { websiteEnabled } = useFeatureAvailability();
const { getPopularToolUsage } = useToolUsage();
const popularToolKeys = ref<string[]>(
  POPULAR_TOOL_FALLBACK_KEYS.filter((key) => websiteEnabled(key)).slice(0, POPULAR_TOOL_CARD_COUNT),
);

const HOME_CATEGORY_KEYS = {
  "pdf": {
    "name": "shared.home_categories.pdf_name",
    "description": "shared.home_categories.pdf_description"
  },
  "image": {
    "name": "shared.home_categories.image_name",
    "description": "shared.home_categories.image_description"
  },
  "qr-barcode": {
    "name": "shared.home_categories.qr_barcode_name",
    "description": "shared.home_categories.qr_barcode_description"
  },
  "calculators": {
    "name": "shared.home_categories.calculators_name",
    "description": "shared.home_categories.calculators_description"
  },
  "khmer-tools": {
    "name": "shared.home_categories.khmer_tools_name",
    "description": "shared.home_categories.khmer_tools_description"
  },
  "developer-tools": {
    "name": "shared.home_categories.developer_tools_name",
    "description": "shared.home_categories.developer_tools_description"
  }
} as const;



const currentHomeCategoryCopy = computed(() =>
  Object.fromEntries(Object.entries(HOME_CATEGORY_KEYS).map(([key, copy]) => [key, { name: t(copy.name), description: t(copy.description) }])) as Record<string, { name: string; description: string }>,
);

function pickLandingTools(keys: readonly string[]) {
  return keys
    .map((key) => LANDING_TOOLS.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool) && websiteEnabled(tool.key));
}

const landingTools = computed(() => LANDING_TOOLS.filter((tool) => websiteEnabled(tool.key)).map(localizeTool));
const popularTools = computed(() =>
  pickLandingTools(popularToolKeys.value).map(localizeTool),
);
const landingCategories = computed(() =>
  LANDING_CATEGORIES.filter((category) => category.key in HOME_CATEGORY_KEYS)
    .map((category) => ({ ...category, tools: category.tools.filter((tool) => websiteEnabled(tool.key)) }))
    .filter((category) => category.tools.length > 0)
    .map(localizeCategory)
    .map((category) => ({ ...category, ...currentHomeCategoryCopy.value[category.key], count: category.tools.length })),
);

function shuffledToolKeys(excludedKeys: Set<string>) {
  const keys = LANDING_TOOLS
    .map((tool) => tool.key)
    .filter((key) => !excludedKeys.has(key) && websiteEnabled(key));

  for (let index = keys.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [keys[index], keys[randomIndex]] = [keys[randomIndex], keys[index]];
  }

  return keys;
}

async function loadPopularTools() {
  try {
    const databaseRanking = await getPopularToolUsage();
    const knownKeys = new Set(LANDING_TOOLS.map((tool) => tool.key));
    const rankedKeys = databaseRanking
      .map((item) => item.toolKey)
      .filter((key, index, keys) => knownKeys.has(key) && websiteEnabled(key) && keys.indexOf(key) === index)
      .slice(0, POPULAR_TOOL_CARD_COUNT);
    const selectedKeys = new Set(rankedKeys);

    // A new or lightly used database should still fill the popular tools row.
    popularToolKeys.value = [
      ...rankedKeys,
      ...shuffledToolKeys(selectedKeys),
    ].slice(0, POPULAR_TOOL_CARD_COUNT);
  } catch {
    // Keep the curated initial order when the aggregate endpoint is temporarily unavailable.
  }
}

onMounted(() => {
  void loadPopularTools();
});
</script>

<template>
  <div
    class="mx-auto w-full max-w-[1200px] pb-24 text-slate-950 transition-colors sm:pb-0 dark:text-white"
  >
    <h1 class="hidden sm:block sm:sr-only">{{ t("shared.components_landing_hero_section.free_online_tools_for_everyday_work") }}</h1>
    <!-- Share the mobile content flow; its in-page header stays mobile-only. -->
    <MobileLandingPage
      :tools="landingTools"
      :popular-tools="popularTools"
      :categories="landingCategories"
    />
  </div>
</template>
