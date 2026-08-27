<script setup lang="ts">
import HeroSection from "./HeroSection.vue";
import LandingFaq from "./LandingFaq.vue";
import MobileLandingPage from "./MobileLandingPage.vue";
import ToolCategorySection from "./ToolCategorySection.vue";
import LandingDeveloperSection from "./LandingDeveloperSection.vue";
import LandingWhyUse from "./LandingWhyUse.vue";
import LandingMomentsSection from "./LandingMomentsSection.vue";

import {
  LANDING_CATEGORIES,
  LANDING_TOOLS,
  type LandingTool,
} from "~/data/tools";

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
const POPULAR_TOOL_CARD_COUNT = 8;

const { localizeCategory, localizeTool } = useLanguage();
const { getPopularToolUsage } = useToolUsage();
const popularToolKeys = ref<string[]>(
  POPULAR_TOOL_FALLBACK_KEYS.slice(0, POPULAR_TOOL_CARD_COUNT),
);

const HOME_CATEGORY_COPY: Record<string, Pick<(typeof LANDING_CATEGORIES)[number], "name" | "description">> = {
  pdf: { name: "Work with PDFs", description: "Merge, split, compress, reorder, and create PDF files." },
  image: { name: "Prepare images", description: "Compress images and convert them into useful formats." },
  "qr-barcode": { name: "Create codes", description: "Generate and scan QR codes, Wi-Fi codes, and barcodes." },
  calculators: { name: "Calculate and track", description: "Split expenses, track spending, and calculate dates." },
  "khmer-tools": { name: "Khmer and text", description: "Clean Khmer text and listen to written content." },
  "developer-tools": { name: "Developer utilities", description: "Format, inspect, encode, test, and generate developer data." },
};

function pickLandingTools(keys: readonly string[]) {
  return keys
    .map((key) => LANDING_TOOLS.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool));
}

const landingTools = computed(() => LANDING_TOOLS.map(localizeTool));
const popularTools = computed(() =>
  pickLandingTools(popularToolKeys.value).map(localizeTool),
);
const landingCategories = computed(() =>
  LANDING_CATEGORIES.filter((category) => category.key in HOME_CATEGORY_COPY)
    .map(localizeCategory)
    .map((category) => ({ ...category, ...HOME_CATEGORY_COPY[category.key] })),
);

function shuffledToolKeys(excludedKeys: Set<string>) {
  const keys = LANDING_TOOLS
    .map((tool) => tool.key)
    .filter((key) => !excludedKeys.has(key));

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
      .filter((key, index, keys) => knownKeys.has(key) && keys.indexOf(key) === index)
      .slice(0, POPULAR_TOOL_CARD_COUNT);
    const selectedKeys = new Set(rankedKeys);

    // A new or lightly used database should still render complete desktop and mobile grids.
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
    <!-- CSS selects the composition so server and hydration markup remain deterministic. -->
    <MobileLandingPage
      class="sm:hidden"
      :tools="landingTools"
      :popular-tools="popularTools"
      :categories="landingCategories"
    />

    <div class="hidden sm:block">
      <HeroSection :tools="landingTools" :popular-tools="popularTools" />
      <ToolCategorySection :categories="landingCategories" />
      <LandingMomentsSection />
      <LandingWhyUse />
      <LandingDeveloperSection />
    </div>

    <LandingFaq class="hidden sm:block" />
  </div>
</template>
