<script setup lang="ts">
import {
  ALL_TOOLS_ICON_PATHS,
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";

const toolNavSearch = ref("");
const filteredEnabledTools = computed(() =>
  filterTools(ENABLED_TOOLS, toolNavSearch.value),
);
const groupedEnabledTools = computed(() =>
  groupTools(filteredEnabledTools.value),
);
const allToolsIconPaths = ALL_TOOLS_ICON_PATHS;
const toolIconPaths = TOOL_ICON_PATHS;
const toolIconClass = TOOL_ICON_CLASSES;

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

// ✅ mobile drawer state
const isMenuOpen = ref(false);
const closeMenu = () => (isMenuOpen.value = false);

// ✅ auto close on route change
const route = useRoute();
watch(
  () => route.fullPath,
  () => closeMenu(),
);

// ✅ lock background scroll when menu open
watch(isMenuOpen, (open) => {
  if (!process.client) return;
  document.body.style.overflow = open ? "hidden" : "";
});

onBeforeUnmount(() => {
  if (!process.client) return;
  document.body.style.overflow = "";
});
</script>

<template>
  <!-- ✅ make whole page a flex column -->
  <div class="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
    <!-- Top Task Bar -->
    <header class="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div
        class="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-3 sm:px-4"
      >
        <!-- Brand -->
        <NuxtLink
          to="/"
          class="flex min-w-0 items-center gap-3"
          @click="closeMenu"
        >
          <img
            src="/assets/chlart-work.png"
            alt="ChlatWork"
            class="h-9 w-9 shrink-0 rounded-xl object-contain"
          />

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold leading-tight">
              ChlatWork
            </p>
            <p class="hidden truncate text-xs text-gray-500 sm:block">
              Simple tools that get things done.
            </p>
          </div>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden items-center gap-2 text-sm sm:flex">
          <NuxtLink
            to="/"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            Home
          </NuxtLink>
          <NuxtLink
            to="/tools"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            Tools
          </NuxtLink>
        </nav>

        <!-- Mobile Hamburger -->
        <button
          class="inline-flex items-center justify-center rounded-xl border bg-white p-2 text-gray-700 shadow-sm transition hover:bg-gray-50 sm:hidden"
          aria-label="Open menu"
          :aria-expanded="isMenuOpen"
          @click="isMenuOpen = !isMenuOpen"
        >
          <!-- hamburger / close -->
          <svg
            v-if="!isMenuOpen"
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>

          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </header>

    <!-- ✅ Mobile Drawer + Overlay -->
    <div v-show="isMenuOpen" class="fixed inset-0 z-40 sm:hidden">
      <!-- overlay -->
      <button
        class="absolute inset-0 bg-black/40"
        aria-label="Close menu"
        @click="closeMenu"
      />

      <!-- drawer -->
      <aside
        class="absolute left-0 top-0 h-full w-[88%] max-w-[340px] bg-white shadow-2xl flex flex-col"
      >
        <!-- ✅ Sticky header -->
        <div class="sticky top-0 z-10 border-b bg-white px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex min-w-0 items-center gap-3">
              <img
                src="/assets/chlart-work.png"
                alt="ChlatWork"
                class="h-8 w-8 shrink-0 rounded-lg object-contain"
              />
              <p class="truncate text-sm font-semibold">ChlatWork</p>
            </div>

            <button
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Close menu"
              @click="closeMenu"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- ✅ Scroll ONLY here -->
        <div class="flex-1 overflow-y-auto px-2 py-3">
          <!-- Main -->
          <nav class="space-y-1">
            <NuxtLink
              to="/"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M4 11.5 12 5l8 6.5" />
                  <path d="M6.5 10.5V19h11v-8.5" />
                  <path d="M10 19v-5h4v5" />
                </svg>
              </span>
              Home
            </NuxtLink>

            <NuxtLink
              to="/tools"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    v-for="path in allToolsIconPaths"
                    :key="path"
                    :d="path"
                  />
                </svg>
              </span>
              All Tools
            </NuxtLink>
          </nav>

          <div class="mt-4 px-3">
            <label for="mobile-tool-nav-search" class="sr-only">
              Search tools
            </label>
            <div class="flex gap-2">
              <input
                id="mobile-tool-nav-search"
                v-model="toolNavSearch"
                type="search"
                class="h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
                placeholder="Search tools"
              />
              <button
                v-if="toolNavSearch"
                type="button"
                class="h-10 shrink-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                @click="toolNavSearch = ''"
              >
                Clear
              </button>
            </div>
          </div>

          <p
            v-if="filteredEnabledTools.length === 0"
            class="px-3 py-4 text-sm text-gray-500"
          >
            No tools found.
          </p>

          <div
            v-for="group in groupedEnabledTools"
            :key="group.category"
            class="mt-4"
          >
            <p
              class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              {{ group.category }}
            </p>

            <nav class="space-y-1">
              <NuxtLink
                v-for="t in group.tools"
                :key="t.key"
                :to="t.route"
                class="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                active-class="bg-gray-900 text-white hover:bg-gray-900"
                @click="closeMenu"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  :class="toolIconClass[t.key] || toolIconClass.calculator"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      v-for="path in toolIconPaths[t.key] ||
                      toolIconPaths.calculator"
                      :key="path"
                      :d="path"
                    />
                  </svg>
                </span>
                <span class="min-w-0 truncate">{{ t.name }}</span>
              </NuxtLink>
            </nav>
          </div>
        </div>
      </aside>
    </div>

    <!-- ✅ Content wrapper grows to push footer to bottom -->
    <div class="flex-1">
      <!-- Layout body -->
      <div
        class="mx-auto grid max-w-[1440px] gap-6 px-3 py-6 sm:px-4 md:grid-cols-[320px_1fr]"
      >
        <!-- Desktop Sidebar -->
        <aside class="hidden h-fit rounded-2xl bg-white p-4 shadow-sm md:block">
          <p
            class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Tools
          </p>

          <div class="space-y-1">
            <NuxtLink
              to="/tools"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-gray-100"
              active-class="bg-gray-900 text-white hover:bg-gray-900"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700"
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    v-for="path in allToolsIconPaths"
                    :key="path"
                    :d="path"
                  />
                </svg>
              </span>
              <span>All Tools</span>
            </NuxtLink>

            <div class="px-3 py-2">
              <label for="tool-nav-search" class="sr-only">Search tools</label>
              <input
                id="tool-nav-search"
                v-model="toolNavSearch"
                type="search"
                class="h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
                placeholder="Search tools"
              />
            </div>

            <p
              v-if="filteredEnabledTools.length === 0"
              class="px-3 py-4 text-sm text-gray-500"
            >
              No tools found.
            </p>

            <div
              v-for="group in groupedEnabledTools"
              :key="group.category"
              class="pt-3 first:pt-2"
            >
              <p
                class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
              >
                {{ group.category }}
              </p>

              <NuxtLink
                v-for="t in group.tools"
                :key="t.key"
                :to="t.route"
                class="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-gray-100"
                active-class="bg-gray-900 text-white hover:bg-gray-900"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  :class="toolIconClass[t.key] || toolIconClass.calculator"
                  aria-hidden="true"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      v-for="path in toolIconPaths[t.key] ||
                      toolIconPaths.calculator"
                      :key="path"
                      :d="path"
                    />
                  </svg>
                </span>
                <span class="truncate">{{ t.name }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>

        <!-- Page content -->
        <main class="min-w-0">
          <slot />
        </main>
      </div>
    </div>

    <!-- ✅ Footer now sticks to bottom -->
    <footer class="mt-0 border-t bg-white py-6">
      <div
        class="mx-auto max-w-[1440px] px-3 text-sm sm:px-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <!-- Left links -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-gray-500">
          <NuxtLink to="/about" class="hover:text-gray-900">About</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-gray-900"
            >Privacy Policy</NuxtLink
          >
          <NuxtLink to="/cookies" class="hover:text-gray-900"
            >Cookie Policy</NuxtLink
          >
          <NuxtLink to="/terms" class="hover:text-gray-900">Terms</NuxtLink>
          <NuxtLink to="/disclaimer" class="hover:text-gray-900"
            >Disclaimer</NuxtLink
          >
          <NuxtLink to="/contact" class="hover:text-gray-900">Contact</NuxtLink>
        </div>

        <!-- Right CTA -->
        <NuxtLink
          to="/buy-me-coffee"
          class="inline-flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        >
          Buy me a coffee ☕🤣
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
