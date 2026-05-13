<script setup lang="ts">
import AnimatedToolShowcase from "./AnimatedToolShowcase.vue";
import HeroSection from "./HeroSection.vue";
import LandingCTA from "./LandingCTA.vue";
import StickyToolPreview from "./StickyToolPreview.vue";
import ToolCategorySection from "./ToolCategorySection.vue";

import {
  DEVELOPER_TOOLS,
  LANDING_CATEGORIES,
  LANDING_TOOLS,
  UTILITY_TOOLS,
} from "~/data/tools";
</script>

<template>
  <div
    class="overflow-clip rounded-[28px] border border-gray-200/80 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)] text-gray-950 shadow-2xl shadow-slate-200/70 transition-colors dark:border-white/10 dark:bg-[#1c1c1e] dark:bg-none dark:text-white dark:shadow-black/25"
  >
    <HeroSection :tools="LANDING_TOOLS" />
    <ToolCategorySection :categories="LANDING_CATEGORIES" />
    <AnimatedToolShowcase
      :utility-tools="UTILITY_TOOLS"
      :developer-tools="DEVELOPER_TOOLS"
    />
    <StickyToolPreview :tools="LANDING_TOOLS" />
    <LandingCTA />
  </div>
</template>
