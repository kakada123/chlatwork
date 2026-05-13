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
    class="overflow-clip rounded-[28px] border border-sky-100/90 bg-[radial-gradient(circle_at_16%_16%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_86%_30%,rgba(217,70,239,0.11),transparent_26%),linear-gradient(135deg,#f8fbff_0%,#edf7ff_48%,#fff7fe_100%)] text-slate-950 shadow-2xl shadow-sky-100/80 transition-colors dark:border-white/10 dark:bg-[radial-gradient(circle_at_16%_16%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_86%_30%,rgba(217,70,239,0.11),transparent_28%),linear-gradient(135deg,#020712_0%,#070b17_48%,#02040b_100%)] dark:text-white dark:shadow-black/25"
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
