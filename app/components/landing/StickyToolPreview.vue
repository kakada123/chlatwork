<script setup lang="ts">
import type { LandingTool } from "~/data/tools";

const props = defineProps<{
  tools: LandingTool[];
}>();

const sectionEl = ref<HTMLElement | null>(null);
useLandingReveal(sectionEl);
</script>

<template>
  <section ref="sectionEl" class="px-5 py-16 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-7xl">
      <div class="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <div data-reveal>
          <p class="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600 dark:text-[#8ab4ff]">
            Sticky Preview
          </p>
          <h2 class="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white sm:text-5xl">
            A focused workspace for practical tasks.
          </h2>
        </div>

        <div data-reveal="right">
          <p class="mt-5 max-w-xl text-base leading-7 text-gray-600 dark:text-white/60">
            ChlatWork keeps the interface quiet and the actions direct. Open a
            tool, finish the job, move on.
          </p>
          <NuxtLink
            to="/tools"
            class="mt-6 inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-950 shadow-lg shadow-slate-200/70 transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.12] dark:bg-white/10 dark:text-white dark:shadow-black/20 dark:hover:bg-white/[0.15] dark:focus:ring-white/40"
          >
            Browse all tools
          </NuxtLink>
        </div>
      </div>

      <div class="mt-10 grid gap-4 md:grid-cols-2">
        <NuxtLink
          v-for="(tool, index) in props.tools"
          :key="tool.key"
          :to="tool.route"
          class="preview-card group relative isolate flex min-h-[220px] overflow-hidden rounded-[26px] border border-gray-200/80 bg-white/80 p-4 shadow-xl shadow-slate-200/70 backdrop-blur transition hover:-translate-y-1 hover:border-gray-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20 dark:hover:bg-white/[0.11] dark:focus:ring-white/40"
          :data-reveal="index % 2 === 0 ? 'left' : 'right'"
          :style="{ '--reveal-delay': `${Math.min(index, 6) * 55}ms` }"
        >
          <span
            class="absolute -right-10 -top-10 z-0 h-28 w-28 rounded-full bg-gradient-to-br opacity-25 blur-2xl transition group-hover:scale-125 group-hover:opacity-45"
            :class="tool.accent"
            aria-hidden="true"
          />
          <span class="relative z-10 flex w-full flex-col">
            <span class="flex items-start justify-between gap-3">
              <span
                class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-slate-200/70 transition dark:!bg-transparent dark:bg-gradient-to-br dark:!text-white dark:shadow-black/20 dark:group-hover:!bg-transparent"
                :class="[tool.iconClass, tool.accent]"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    v-for="path in tool.iconPaths"
                    :key="path"
                    :d="path"
                  />
                </svg>
              </span>

              <span
                class="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-white/[0.08] dark:text-white/[0.45]"
              >
                {{ tool.category }}
              </span>
            </span>

            <span class="mt-5 block">
              <span class="block text-lg font-black leading-tight text-gray-950 dark:text-white">
                {{ tool.name }}
              </span>
              <span class="mt-3 block text-sm leading-6 text-gray-600 dark:text-white/[0.58]">
                {{ tool.description }}
              </span>
            </span>

            <span class="mt-auto pt-6 text-sm font-bold text-teal-700 transition group-hover:translate-x-1 dark:text-[#8ab4ff]">
              Open tool
            </span>
          </span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    rgb(255 255 255 / 0.72),
    rgb(20 184 166 / 0.12),
    rgb(99 102 241 / 0.10)
  );
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity 0.35s ease,
    transform 0.35s ease;
}

.preview-card:hover::before {
  opacity: 1;
  transform: scale(1);
}

:global(.dark) .preview-card::before {
  background: linear-gradient(
    135deg,
    rgb(255 255 255 / 0.08),
    rgb(10 132 255 / 0.12),
    rgb(94 92 230 / 0.12)
  );
}

@media (prefers-reduced-motion: reduce) {
  .preview-card::before {
    transition: none;
  }
}
</style>
