<script setup lang="ts">
import {
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";

useSeoMeta({
  title: "Tools - ChlatWork",
  description: "Explore privacy-friendly utilities and developer tools.",
});

const toolSearch = ref("");

const filteredTools = computed(() => filterTools(ENABLED_TOOLS, toolSearch.value));
const groupedTools = computed(() => groupTools(filteredTools.value));
const filteredToolCount = computed(() => filteredTools.value.length);

function filterTools(tools: ToolDef[], query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return tools;
  }

  return tools.filter((tool) =>
    [tool.name, tool.description, tool.category, tool.key]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
}

function groupTools(tools: ToolDef[]) {
  const groups = new Map<string, ToolDef[]>();

  for (const tool of tools) {
    const current = groups.get(tool.category) ?? [];
    current.push(tool);
    groups.set(tool.category, current);
  }

  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    tools: items,
  }));
}
</script>

<template>
  <main class="mx-auto w-full max-w-6xl space-y-8">
    <header class="space-y-1">
      <h1 class="text-xl font-bold">Tools</h1>
      <p class="text-sm text-gray-500">Pick a tool and get things done.</p>
    </header>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <label for="tool-search" class="block text-sm font-semibold text-gray-900">
        Search tools
      </label>
      <div class="mt-2 flex gap-2">
        <input
          id="tool-search"
          v-model="toolSearch"
          type="search"
          class="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="Search by tool name, category, or task"
        />
        <button
          v-if="toolSearch"
          type="button"
          class="h-10 shrink-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          @click="toolSearch = ''"
        >
          Clear
        </button>
      </div>
      <p class="mt-2 text-xs text-gray-500">
        {{ filteredToolCount }} of {{ ENABLED_TOOLS.length }} tools
      </p>
    </section>

    <section
      v-if="filteredToolCount === 0"
      class="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-gray-500"
    >
      No tools found.
    </section>

    <section v-for="group in groupedTools" :key="group.category" class="space-y-3">
      <div class="flex items-end justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {{ group.category }}
          </h2>
          <p class="mt-1 text-xs text-gray-400">
            {{ group.tools.length }} tools
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        <NuxtLink
          v-for="tool in group.tools"
          :key="tool.key"
          :to="tool.route"
          class="group h-full rounded-xl border bg-white p-4 shadow-sm transition hover:shadow active:scale-[0.99]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-start gap-3">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition"
                :class="TOOL_ICON_CLASSES[tool.key] || TOOL_ICON_CLASSES.calculator"
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
                    v-for="path in TOOL_ICON_PATHS[tool.key] || TOOL_ICON_PATHS.calculator"
                    :key="path"
                    :d="path"
                  />
                </svg>
              </span>

              <div class="min-w-0">
                <h3 class="text-base font-semibold leading-snug text-gray-900 sm:truncate">
                  {{ tool.name }}
                </h3>
                <p class="mt-1 text-sm text-gray-500 line-clamp-2">
                  {{ tool.description }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between">
            <p class="truncate text-xs text-gray-400">
              {{ tool.category }}
            </p>

            <span class="text-xs text-gray-300 transition group-hover:text-gray-400">
              ->
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
