<script setup lang="ts">
import HeroSection from "./HeroSection.vue";
import LandingFaq from "./LandingFaq.vue";
import LandingWhyUse from "./LandingWhyUse.vue";
import ToolCategorySection from "./ToolCategorySection.vue";

import {
  LANDING_CATEGORIES,
  LANDING_TOOLS,
  type LandingTool,
} from "~/data/tools";

const POPULAR_TOOL_KEYS = [
  // Keep PayBack first even when the remaining popular tools are reordered.
  "payback-calculator",
  "qr",
  "image-compress",
  "image-to-pdf",
  "merge-pdf",
  "khmer-unicode-fixer",
  "password-generator",
  "json-formatter",
] as const;

const { localizeCategory, localizeTool } = useLanguage();

function pickLandingTools(keys: readonly string[]) {
  return keys
    .map((key) => LANDING_TOOLS.find((tool) => tool.key === key))
    .filter((tool): tool is LandingTool => Boolean(tool));
}

const landingTools = computed(() => LANDING_TOOLS.map(localizeTool));
const popularTools = computed(() =>
  pickLandingTools(POPULAR_TOOL_KEYS).map(localizeTool),
);
const landingCategories = computed(() =>
  LANDING_CATEGORIES.map(localizeCategory),
);
</script>

<template>
  <div
    class="mx-auto w-full max-w-[1440px] text-slate-950 transition-colors dark:text-white"
  >
    <HeroSection :tools="landingTools" :popular-tools="popularTools" />
    <ToolCategorySection :categories="landingCategories" />
    <LandingWhyUse />
    <LandingFaq />
  </div>
</template>
