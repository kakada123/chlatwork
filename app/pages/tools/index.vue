<script setup lang="ts">
import { ENABLED_TOOLS, TOOLS, type ToolStatus } from "~/lib/tool-registry";

useSeoMeta({
  title: "Tools — ChlatWork",
  description: "Explore privacy-friendly tools for everyday work.",
});

const comingSoon = computed(() => TOOLS.filter((t) => !t.enabled));

const toolIconPaths: Record<string, string[]> = {
  calculator: [
    "M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
    "M8 7h8",
    "M8 11h2",
    "M14 11h2",
    "M8 15h2",
    "M14 15h2",
  ],
  qr: [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M14 14h2",
    "M18 14h2v2",
    "M14 18h2v2",
    "M18 20h2",
  ],
  "wifi-qr": [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M13.5 15.5a5.5 5.5 0 0 1 7 0",
    "M15.5 18a2.5 2.5 0 0 1 3 0",
    "M17 20h.01",
  ],
  "payback-calculator": [
    "M7 7h11",
    "M7 7l3-3",
    "M7 7l3 3",
    "M17 17H6",
    "M17 17l-3-3",
    "M17 17l-3 3",
  ],
  "expense-tracker": [
    "M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5",
  ],
  barcode: [
    "M4 5v14",
    "M7 5v14",
    "M11 5v14",
    "M13 5v14",
    "M17 5v14",
    "M20 5v14",
  ],
  "image-compress": [
    "M4 5h16v14H4V5Z",
    "M8 11l3 3 2-2 4 4",
    "M8 9h.01",
    "M9 20v-3",
    "M15 20v-3",
  ],
  "lucky-draw": [
    "M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 18l.9-5.4-3.9-3.8 5.4-.8L12 3Z",
    "M19 21l-3-3",
    "M5 21l3-3",
  ],
};

const badgeClass = (s: ToolStatus) => {
  if (s === "stable") return "bg-green-100 text-green-700";
  if (s === "beta") return "bg-yellow-100 text-yellow-700";
  if (s === "alpha") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
};
</script>

<template>
  <main class="mx-auto w-full max-w-6xl">
    <!-- Header -->
    <header class="space-y-1 pb-6">
      <h1 class="text-xl font-bold">Tools</h1>
      <p class="text-sm text-gray-500">Pick a tool and get things done.</p>
    </header>

    <!-- ✅ Enabled tools -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      <NuxtLink
        v-for="t in ENABLED_TOOLS"
        :key="t.key"
        :to="t.route"
        class="group h-full rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow active:scale-[0.99]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition group-hover:bg-gray-900 group-hover:text-white"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  v-for="path in toolIconPaths[t.key] || toolIconPaths.calculator"
                  :key="path"
                  :d="path"
                />
              </svg>
            </span>

            <div class="min-w-0">
              <!-- Title -->
              <h2
                class="text-base font-semibold leading-snug text-gray-900 sm:truncate"
              >
                {{ t.name }}
              </h2>

              <!-- Description -->
              <p class="mt-1 text-sm text-gray-500 line-clamp-2 sm:line-clamp-1">
                {{ t.description }}
              </p>
            </div>
          </div>

          <!-- Status badge -->
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="badgeClass(t.status)"
          >
            {{ t.status }}
          </span>
        </div>

        <div class="mt-3 flex items-center justify-between">
          <p class="text-xs text-gray-400 truncate">
            {{ t.category }}
          </p>

          <span
            class="text-xs text-gray-300 transition group-hover:text-gray-400"
          >
            →
          </span>
        </div>
      </NuxtLink>
    </div>
  </main>
</template>
