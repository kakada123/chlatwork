<script setup lang="ts">
import { ENABLED_TOOLS, TOOLS, type ToolStatus } from "~/lib/tool-registry";

const enabledTools = computed(() => ENABLED_TOOLS);
const comingSoon = computed(() => TOOLS.filter((t) => !t.enabled));

const badgeClass = (s: ToolStatus) => {
  if (s === "stable") return "bg-green-100 text-green-700";
  if (s === "beta") return "bg-yellow-100 text-yellow-700";
  if (s === "alpha") return "bg-purple-100 text-purple-700";
  return "bg-gray-100 text-gray-600";
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <!-- Top Task Bar -->
    <header class="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"
      >
        <NuxtLink to="/" class="flex items-center gap-2">
          <!-- Logo -->
          <div class="h-9 w-9 rounded-xl bg-gray-900"></div>
          <div class="leading-tight">
            <p class="text-sm font-semibold">ChlatWork</p>
            <p class="text-xs text-gray-500 truncate max-w-[220px]">
              Smart tools — release one by one ✨
            </p>
          </div>
        </NuxtLink>

        <!-- Right side actions -->
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/tools"
            class="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Tools
          </NuxtLink>

          <a
            href="https://github.com/"
            target="_blank"
            class="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            GitHub
          </a>
        </div>
      </div>
    </header>

    <!-- Layout body -->
    <div
      class="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr]"
    >
      <!-- Sidebar -->
      <aside class="rounded-2xl bg-white p-4 shadow-sm h-fit">
        <p
          class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Tools
        </p>

        <div class="space-y-1">
          <NuxtLink
            to="/tools"
            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-gray-100"
            active-class="bg-gray-900 text-white hover:bg-gray-900"
          >
            <span>All Tools</span>
          </NuxtLink>

          <NuxtLink
            v-for="t in enabledTools"
            :key="t.key"
            :to="t.route"
            class="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-gray-100"
            active-class="bg-gray-900 text-white hover:bg-gray-900"
          >
            <span class="truncate">{{ t.name }}</span>

            <span
              class="text-[10px] rounded-full px-2 py-0.5"
              :class="badgeClass(t.status)"
            >
              {{ t.status }}
            </span>
          </NuxtLink>

          <div class="mt-4">
            <p
              class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Coming soon
            </p>

            <div
              v-for="t in comingSoon"
              :key="t.key"
              class="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-gray-400"
            >
              <span class="truncate">{{ t.name }}</span>
              <span class="text-[10px] rounded-full bg-gray-100 px-2 py-0.5">
                soon
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Page content -->
      <main class="min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
