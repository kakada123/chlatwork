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
  "qr",
  "image-compress",
  "image-to-pdf",
  "merge-pdf",
  "payback-calculator",
  "khmer-unicode-fixer",
  "json-formatter",
  "password-generator",
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
    class="overflow-clip rounded-[28px] border border-sky-100/90 bg-[radial-gradient(circle_at_16%_16%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_86%_30%,rgba(217,70,239,0.11),transparent_26%),linear-gradient(135deg,#f8fbff_0%,#edf7ff_48%,#fff7fe_100%)] text-slate-950 shadow-2xl shadow-sky-100/80 transition-colors dark:border-white/10 dark:bg-[radial-gradient(circle_at_16%_16%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_86%_30%,rgba(217,70,239,0.11),transparent_28%),linear-gradient(135deg,#020712_0%,#070b17_48%,#02040b_100%)] dark:text-white dark:shadow-black/25"
  >
    <HeroSection :tools="landingTools" :popular-tools="popularTools" />
    <ToolCategorySection :categories="landingCategories" />
    <LandingWhyUse />
    <LandingFaq />
  </div>
</template>
