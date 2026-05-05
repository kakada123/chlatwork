<script setup lang="ts">
import { ENABLED_TOOLS, TOOLS, type ToolStatus } from "~/lib/tool-registry";

useSeoMeta({
  title: "Tools — ChlatWork",
  description: "Explore privacy-friendly tools for everyday work.",
});

const comingSoon = computed(() => TOOLS.filter((t) => !t.enabled));

const toolIconPaths: Record<string, string[]> = {
  calculator: [
    "M6.5 3.5h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z",
    "M8 7.5h8",
    "M8.5 11.5h2",
    "M13.5 11.5h2",
    "M8.5 15.5h2",
    "M13.5 15.5h2",
    "M8.5 18h7",
  ],
  qr: [
    "M4 4h6v6H4V4Z",
    "M14 4h6v6h-6V4Z",
    "M4 14h6v6H4v-6Z",
    "M7 7h.01",
    "M17 7h.01",
    "M7 17h.01",
    "M14 14h2v2",
    "M19 14h1",
    "M14 20h6",
    "M18 18h2",
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
    "M8 6.5h10",
    "M8 6.5l3-3",
    "M8 6.5l3 3",
    "M16 17.5H6",
    "M16 17.5l-3-3",
    "M16 17.5l-3 3",
    "M7 12h10",
    "M12 9.5V14.5",
  ],
  "expense-tracker": [
    "M6 3h12a2 2 0 0 1 2 2v16l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z",
    "M8 8h8",
    "M8 12h8",
    "M8 16h5",
    "M16 16h.01",
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
    "M10 3v2",
    "M14 3v2",
  ],
  "lucky-draw": [
    "M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.3 7.2 18l.9-5.4-3.9-3.8 5.4-.8L12 3Z",
    "M19 21l-3-3",
    "M5 21l3-3",
    "M12 15.3V21",
  ],
};

const toolIconClass: Record<string, string> = {
  calculator: "bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white",
  qr: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white",
  "wifi-qr": "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white",
  "payback-calculator":
    "bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white",
  "expense-tracker":
    "bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white",
  barcode:
    "bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white",
  "image-compress":
    "bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white",
  "lucky-draw":
    "bg-fuchsia-50 text-fuchsia-700 group-hover:bg-fuchsia-600 group-hover:text-white",
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
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition"
              :class="toolIconClass[t.key] || toolIconClass.calculator"
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
