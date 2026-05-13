<script setup lang="ts">
import type { LandingTool } from "~/data/tools";

const props = defineProps<{
  tools: LandingTool[];
}>();

const floatingTools = computed(() => props.tools.slice(0, 7));
</script>

<template>
  <section
    class="relative min-h-[720px] overflow-hidden px-5 py-20 sm:px-8 lg:px-12 lg:py-28"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,0.20),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(99,102,241,0.16),transparent_30%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] dark:hidden"
      aria-hidden="true"
    />
    <div
      class="absolute inset-0 hidden bg-[radial-gradient(circle_at_20%_10%,rgba(45,212,191,0.30),transparent_32%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.26),transparent_30%),linear-gradient(135deg,#1c1c1e_0%,#242426_45%,#151517_100%)] dark:block"
      aria-hidden="true"
    />
    <div
      class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/80 to-transparent dark:via-white/50"
      aria-hidden="true"
    />

    <div
      class="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(15,23,42,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.06)_1px,transparent_1px)] [background-size:72px_72px] dark:opacity-45 dark:[background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)]"
      aria-hidden="true"
    />

    <div
      class="pointer-events-none absolute inset-0 hidden lg:block"
      aria-hidden="true"
    >
      <NuxtLink
        v-for="(tool, index) in floatingTools"
        :key="tool.key"
        :to="tool.route"
        class="floating-tool-card group absolute rounded-2xl border border-gray-200/70 bg-white/75 px-4 py-3 text-sm text-gray-900 shadow-2xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white dark:shadow-black/20"
        :style="{
          '--delay': `${index * -2.4}s`,
          '--float-x': `${index % 2 === 0 ? 14 : -14}px`,
          top: `${10 + ((index * 13) % 64)}%`,
          left: `${index % 2 === 0 ? 6 + index * 7 : 64 + (index % 3) * 8}%`,
        }"
        tabindex="-1"
      >
        <span
          class="mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition dark:!bg-transparent dark:bg-gradient-to-br dark:!text-white dark:group-hover:!bg-transparent"
          :class="[tool.iconClass, tool.accent]"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
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
        <span class="block font-semibold">{{ tool.name }}</span>
      </NuxtLink>
    </div>

    <div class="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_420px] lg:items-center">
      <div class="max-w-4xl">
        <div
          class="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200/80 bg-white/70 px-4 py-2 text-sm text-gray-600 shadow-lg shadow-slate-200/70 backdrop-blur dark:border-white/[0.12] dark:bg-white/[0.08] dark:text-white/75 dark:shadow-black/10"
        >
          <span class="h-2 w-2 rounded-full bg-teal-300 shadow-[0_0_18px_rgba(45,212,191,.9)]" />
          ChlatWork tools platform
        </div>

        <h1
          class="max-w-5xl text-5xl font-black leading-[0.96] tracking-tight text-gray-950 dark:text-white sm:text-6xl lg:text-7xl"
        >
          Simple tools that get things done.
        </h1>

        <p class="mt-6 max-w-2xl text-lg leading-8 text-gray-600 dark:text-white/70 sm:text-xl">
          Fast, clean, and practical tools for daily work, developers, and
          creators.
        </p>

        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center rounded-2xl bg-gray-950 px-6 text-sm font-bold text-white shadow-xl shadow-slate-300/70 transition hover:-translate-y-0.5 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:bg-white dark:text-[#1c1c1e] dark:shadow-black/20 dark:hover:bg-white/90 dark:focus:ring-white/70"
          >
            Explore Tools
          </NuxtLink>
          <NuxtLink
            to="/tools"
            class="inline-flex h-12 items-center justify-center rounded-2xl border border-gray-300 bg-white/75 px-6 text-sm font-bold text-gray-900 backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.12] dark:focus:ring-white/50"
          >
            Developer Tools
          </NuxtLink>
        </div>
      </div>

      <div
        class="relative rounded-[28px] border border-gray-200/80 bg-white/70 p-4 shadow-2xl shadow-slate-200/80 backdrop-blur-xl dark:border-white/[0.12] dark:bg-white/[0.08] dark:shadow-black/30"
      >
        <div class="rounded-[22px] border border-gray-200/80 bg-white/75 p-4 dark:border-white/10 dark:bg-black/20">
          <div
            class="flex h-12 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/90 px-4 text-sm text-gray-500 dark:border-white/10 dark:bg-white/10 dark:text-white/[0.55]"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5 text-gray-400 dark:text-white/[0.45]"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m21 21-4.3-4.3" />
              <circle cx="11" cy="11" r="7" />
            </svg>
            Search tools, formats, QR, Khmer voice...
          </div>

          <div class="mt-4 grid gap-3">
            <NuxtLink
              v-for="tool in props.tools.slice(0, 5)"
              :key="tool.key"
              :to="tool.route"
              class="group flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-400 dark:border-white/[0.08] dark:bg-white/[0.07] dark:hover:bg-white/[0.11] dark:focus:ring-white/40"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-slate-200/70 transition dark:!bg-transparent dark:bg-gradient-to-br dark:!text-white dark:shadow-black/20 dark:group-hover:!bg-transparent"
                :class="[tool.iconClass, tool.accent]"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="h-5 w-5"
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
              <span class="min-w-0">
                <span class="block truncate text-sm font-bold text-gray-950 dark:text-white">
                  {{ tool.name }}
                </span>
                <span class="block truncate text-xs text-gray-500 dark:text-white/50">
                  {{ tool.description }}
                </span>
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.floating-tool-card {
  animation: floating-tool 9s ease-in-out infinite;
  animation-delay: var(--delay);
  transform: translate3d(0, 0, 0);
}

@keyframes floating-tool {
  0%,
  100% {
    transform: translate3d(0, 0, 0) rotate(-1deg);
  }

  50% {
    transform: translate3d(var(--float-x), -18px, 0) rotate(1deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-tool-card {
    animation: none;
  }
}
</style>
