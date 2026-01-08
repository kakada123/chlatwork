<script setup lang="ts">
import { ENABLED_TOOLS, TOOLS, type ToolStatus } from "~/lib/tool-registry";

useSeoMeta({
  title: "Tools — ChlatWork",
  description: "Explore privacy-friendly tools for everyday work.",
});

const comingSoon = computed(() => TOOLS.filter((t) => !t.enabled));

const badgeClass = (s: ToolStatus) => {
  if (s === "stable") return "bg-green-100 text-green-700";
  if (s === "beta") return "bg-yellow-100 text-yellow-700";
  if (s === "alpha") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
};
</script>

<template>
  <main class="mx-auto w-full max-w-6xl px-4 py-6 space-y-6 sm:px-6">
    <!-- Header -->
    <header class="space-y-1">
      <h1 class="text-xl font-bold sm:text-2xl">Tools</h1>
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

    <!-- ✅ Coming soon -->
    <section class="pt-4">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Coming soon
      </h2>

      <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="t in comingSoon"
          :key="t.key"
          class="rounded-2xl border bg-gray-50 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-gray-700 sm:truncate">
                {{ t.name }}
              </p>

              <p
                class="mt-1 text-sm text-gray-500 line-clamp-2 sm:line-clamp-1"
              >
                {{ t.description }}
              </p>
            </div>

            <span
              class="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700"
            >
              soon
            </span>
          </div>

          <p class="mt-3 text-xs text-gray-400 truncate">
            {{ t.category }}
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
