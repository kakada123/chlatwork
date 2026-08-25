<script setup lang="ts">
import HeroSection from "./HeroSection.vue";
import LandingFaq from "./LandingFaq.vue";
import ToolCategorySection from "./ToolCategorySection.vue";
import LandingDeveloperSection from "./LandingDeveloperSection.vue";
import LandingWhyUse from "./LandingWhyUse.vue";
import LandingMomentsSection from "./LandingMomentsSection.vue";

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

const { localizeCategory, localizeTool } = useLanguage();

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
  pickLandingTools(POPULAR_TOOL_KEYS).map(localizeTool),
);
const landingCategories = computed(() =>
  LANDING_CATEGORIES.filter((category) => category.key in HOME_CATEGORY_COPY)
    .map(localizeCategory)
    .map((category) => ({ ...category, ...HOME_CATEGORY_COPY[category.key] })),
);
</script>

<template>
  <div
    class="mx-auto w-full max-w-[1200px] text-slate-950 transition-colors dark:text-white"
  >
    <HeroSection :tools="landingTools" :popular-tools="popularTools" />
    <ToolCategorySection :categories="landingCategories" />
    <LandingMomentsSection />
    <LandingWhyUse />
    <LandingDeveloperSection />
    <LandingFaq />
  </div>
</template>
