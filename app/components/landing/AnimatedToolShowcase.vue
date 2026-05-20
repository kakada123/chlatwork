<script setup lang="ts">
import type { LandingTool } from "~/data/tools";

const props = defineProps<{
  utilityTools: LandingTool[];
  pdfTools: LandingTool[];
  developerTools: LandingTool[];
}>();

const sectionEl = ref<HTMLElement | null>(null);
const viewportEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);
const activeIndex = ref(0);
const isPinned = ref(false);
const maxTranslate = ref(0);
const progress = ref(0);
const pinnedHeight = ref("auto");

useLandingReveal(sectionEl);

const PINNED_SCROLL_MIN_RATIO = 0.72;
const PINNED_SCROLL_MAX_RATIO = 1.45;
const PINNED_SCROLL_TRACK_RATIO = 0.34;

const showcaseTools = computed(() => [
  ...props.utilityTools,
  ...props.pdfTools,
  ...props.developerTools,
]);
const activeTool = computed(
  () => showcaseTools.value[activeIndex.value] ?? showcaseTools.value[0],
);
const scrollPercent = computed(() => `${Math.round(progress.value * 100)}%`);
const trackStyle = computed(() =>
  isPinned.value
    ? {
        transform: `translate3d(-${progress.value * maxTranslate.value}px, 0, 0)`,
      }
    : undefined,
);

let scrollFrame = 0;
let resizeObserver: ResizeObserver | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPinnedScrollDistance(trackOverflow: number) {
  const minDistance = window.innerHeight * PINNED_SCROLL_MIN_RATIO;
  const maxDistance = window.innerHeight * PINNED_SCROLL_MAX_RATIO;

  return Math.min(
    trackOverflow,
    clamp(trackOverflow * PINNED_SCROLL_TRACK_RATIO, minDistance, maxDistance),
  );
}

function updateScrollProgress() {
  if (!import.meta.client || !sectionEl.value || !isPinned.value) {
    progress.value = 0;
    activeIndex.value = 0;
    return;
  }

  const totalScroll = Math.max(1, sectionEl.value.offsetHeight - window.innerHeight);
  const scrolled = clamp(-sectionEl.value.getBoundingClientRect().top, 0, totalScroll);
  progress.value = scrolled / totalScroll;
  activeIndex.value = clamp(
    Math.round(progress.value * Math.max(showcaseTools.value.length - 1, 0)),
    0,
    Math.max(showcaseTools.value.length - 1, 0),
  );
}

function requestScrollProgress() {
  cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(updateScrollProgress);
}

function updatePinnedMetrics() {
  if (!import.meta.client) {
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  isPinned.value = window.innerWidth >= 768 && !reduceMotion;

  const viewportWidth = viewportEl.value?.clientWidth ?? 0;
  const trackWidth = trackEl.value?.scrollWidth ?? 0;
  const trackOverflow = Math.max(0, trackWidth - viewportWidth + 32);

  maxTranslate.value = trackOverflow;
  pinnedHeight.value = isPinned.value && trackOverflow > 0
    ? `${window.innerHeight + getPinnedScrollDistance(trackOverflow)}px`
    : "auto";

  updateScrollProgress();
}

onMounted(() => {
  updatePinnedMetrics();

  window.addEventListener("scroll", requestScrollProgress, { passive: true });
  window.addEventListener("resize", updatePinnedMetrics);

  resizeObserver = new ResizeObserver(updatePinnedMetrics);

  if (trackEl.value) {
    resizeObserver.observe(trackEl.value);
  }

  if (viewportEl.value) {
    resizeObserver.observe(viewportEl.value);
  }
});

onBeforeUnmount(() => {
  cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", requestScrollProgress);
  window.removeEventListener("resize", updatePinnedMetrics);
  resizeObserver?.disconnect();
});
</script>

<template>
  <section
    ref="sectionEl"
    class="relative px-5 py-10 sm:px-8 lg:px-12"
    :style="{ height: pinnedHeight }"
  >
    <div
      class="showcase-pin relative mx-auto max-w-7xl overflow-hidden rounded-[32px] border border-white/80 bg-white/[0.65] p-5 shadow-2xl shadow-sky-100/80 backdrop-blur-xl transition-colors md:sticky md:top-24 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/25 sm:p-7"
    >
      <div
        class="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br opacity-35 blur-3xl transition-all duration-700 dark:opacity-35"
        :class="activeTool?.accent"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-28 right-0 h-72 w-72 rounded-full bg-gradient-to-br opacity-28 blur-3xl transition-all duration-700 dark:opacity-30"
        :class="activeTool?.accent"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),rgba(255,255,255,0.08),rgba(217,70,239,0.08))] dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.07),rgba(255,255,255,0.025),rgba(217,70,239,0.07))]"
        aria-hidden="true"
      />

      <div class="relative z-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
        <div>
          <p class="text-sm font-semibold uppercase text-sky-600 dark:text-cyan-300">
            Tool Flow
          </p>
          <h2 class="mt-3 max-w-2xl text-3xl font-black text-slate-950 dark:text-white sm:text-5xl">
            Find the right tool in one smooth flow.
          </h2>
        </div>

        <div class="lg:justify-self-end">
          <p class="max-w-xl text-sm leading-6 text-slate-600 dark:text-white/[0.58]">
            Utilities, PDF tools, and developer helpers move through a focused
            rail, with each card getting a clear moment as it comes into view.
          </p>
          <div class="mt-5 h-1.5 overflow-hidden rounded-full bg-sky-100 dark:bg-white/10">
            <div
              class="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 transition-[width] duration-150"
              :style="{ width: scrollPercent }"
            />
          </div>
        </div>
      </div>

      <div
        ref="viewportEl"
        class="relative z-10 -mx-3 mt-7 overflow-x-auto overflow-y-visible px-3 pb-2 pt-3 md:-mx-5 md:overflow-hidden md:px-5"
      >
        <div
          ref="trackEl"
          class="showcase-track grid w-max grid-flow-col grid-rows-1 gap-4 pr-6 transition-transform duration-75 ease-linear will-change-transform md:grid-rows-2"
          :style="trackStyle"
        >
          <div
            v-for="(tool, index) in showcaseTools"
            :key="tool.key"
            class="shrink-0"
            :data-reveal="index % 2 === 0 ? 'left' : 'right'"
            :style="{ '--reveal-delay': `${Math.min(index, 8) * 45}ms` }"
          >
            <LandingToolCard
              :tool="tool"
              :active="activeIndex === index"
              :pinned="isPinned"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.showcase-pin {
  min-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .showcase-pin {
    min-height: auto;
  }

  .showcase-track {
    transform: none !important;
  }
}
</style>
