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
  <main class="max-w-5xl mx-auto p-6 space-y-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold">Tools</h1>
      <p class="text-sm text-gray-500">Pick a tool and get things done.</p>
    </header>

    <!-- Enabled -->
    <div class="grid gap-4 md:grid-cols-2">
      <NuxtLink
        v-for="t in ENABLED_TOOLS"
        :key="t.key"
        :to="t.route"
        class="rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-semibold truncate">{{ t.name }}</h2>

            <!-- ✅ no plugin needed -->
            <p class="mt-1 text-sm text-gray-500 truncate">
              {{ t.description }}
            </p>
          </div>

          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
            :class="badgeClass(t.status)"
          >
            {{ t.status }}
          </span>
        </div>

        <p class="mt-3 text-xs text-gray-400">{{ t.category }}</p>
      </NuxtLink>
    </div>

    <!-- Coming soon -->
    <section class="pt-4">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Coming soon
      </h2>

      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div
          v-for="t in comingSoon"
          :key="t.key"
          class="rounded-2xl border bg-gray-50 p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-gray-700 truncate">{{ t.name }}</p>
              <p class="mt-1 text-sm text-gray-500 truncate">
                {{ t.description }}
              </p>
            </div>

            <span
              class="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] text-gray-700"
            >
              soon
            </span>
          </div>

          <p class="mt-3 text-xs text-gray-400">{{ t.category }}</p>
        </div>
      </div>
    </section>
  </main>
</template>
