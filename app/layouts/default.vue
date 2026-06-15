<script setup lang="ts">
import {
  ALL_TOOLS_ICON_PATHS,
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";
import ToolPageDetails from "~/components/tools/ToolPageDetails.vue";
import {
  findToolGuideRouteByPath,
  getToolGuideRoute,
} from "~/data/tool-guide-routes";
import { findStarterGuideByPath } from "~/data/guides";
import { findToolGuideByToolRoute } from "~/data/tool-guides";
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { filterTools } from "~/lib/tool-search";

const toolNavSearch = ref("");
const {
  categoryLabel,
  copy,
  homePath,
  languageLabel,
  fontFamilyForText,
  localizeTool,
  switchLanguage,
} = useLanguage();
const languageToggleFontFamily = computed(() =>
  fontFamilyForText(languageLabel.value),
);
const localizedEnabledTools = computed(() => ENABLED_TOOLS.map(localizeTool));
const filteredEnabledTools = computed(() =>
  filterTools(localizedEnabledTools.value, toolNavSearch.value),
);
const groupedEnabledTools = computed(() =>
  groupTools(filteredEnabledTools.value),
);
const allToolsIconPaths = ALL_TOOLS_ICON_PATHS;
const toolIconPaths = TOOL_ICON_PATHS;
const toolIconClass = TOOL_ICON_CLASSES;
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const route = useRoute();
// The tools index is a catalog page, so it gets the full-width layout instead of the shared sidebar.
const isToolsIndexPage = computed(() => route.path === "/tools");
const isPortfolioPage = computed(() => route.path === "/portfolio");
const isToolGuidePage = computed(() =>
  Boolean(findToolGuideRouteByPath(route.path)),
);
const isStarterGuidePage = computed(
  () => route.path === "/guides" || Boolean(findStarterGuideByPath(route.path)),
);
const currentToolGuide = computed(() => {
  const currentTool = ENABLED_TOOLS.find((tool) => tool.route === route.path);

  if (!currentTool) {
    return null;
  }

  const guideRoute = getToolGuideRoute(currentTool.key);

  if (!guideRoute) {
    return null;
  }

  return {
    guide: findToolGuideByToolRoute(currentTool.route),
    path: guideRoute.path,
    tool: currentTool,
  };
});
const shouldShowToolPageDetails = computed(
  () => currentToolGuide.value?.tool.category !== "PDF Tools",
);
const isLandingPage = computed(
  () =>
    route.path === "/" ||
    route.path === "/km" ||
    isToolsIndexPage.value ||
    isPortfolioPage.value ||
    isToolGuidePage.value ||
    isStarterGuidePage.value,
);
const layoutGridClass = computed(() =>
  isLandingPage.value
    ? "mx-auto grid max-w-[1440px] gap-6 px-3 py-4 sm:px-4"
    : "mx-auto grid max-w-[1440px] items-start gap-6 px-3 py-6 sm:px-4 md:grid-cols-[320px_1fr]",
);

function groupTools(tools: ToolDef[]) {
  const groups = new Map<ToolDef["category"], ToolDef[]>();

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
  <div
    class="flex min-h-screen flex-col bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(217,70,239,0.08),transparent_28%),#f8fbff] text-gray-900 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.08),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(217,70,239,0.08),transparent_28%),#020712] dark:text-white"
  >
    <!-- Top Task Bar -->
    <header class="site-header sticky top-0 z-50 border-b backdrop-blur">
      <div
        class="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-3 sm:px-4"
      >
        <!-- Brand -->
        <NuxtLink
          :to="homePath"
          class="flex min-w-0 items-center gap-3"
          @click="closeMenu"
        >
          <img
            src="/assets/chlart-work-nav.png"
            alt="ChlatWork"
            class="h-9 w-9 shrink-0 rounded-xl object-contain"
          />

          <div class="min-w-0">
            <p class="truncate text-sm font-semibold leading-tight">
              ChlatWork
            </p>
            <p class="hidden truncate text-xs text-gray-500 sm:block">
              {{ copy.tagline }}
            </p>
          </div>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden items-center gap-2 text-sm sm:flex">
          <NuxtLink
            :to="homePath"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            {{ copy.nav.home }}
          </NuxtLink>
          <NuxtLink
            to="/tools"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100"
          >
            {{ copy.nav.tools }}
          </NuxtLink>
          <NuxtLink
            to="/guides"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-white/10"
          >
            Guides
          </NuxtLink>
          <NuxtLink
            to="/about"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-white/10"
          >
            About
          </NuxtLink>
          <NuxtLink
            to="/contact"
            class="rounded-lg px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-white/10"
          >
            Contact
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="language-toggle inline-flex h-10 items-center justify-center rounded-xl border border-sky-200/80 bg-white/75 px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:text-sky-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-white/75 dark:hover:bg-white/[0.12] dark:hover:text-white"
            :style="{ fontFamily: languageToggleFontFamily }"
            :aria-label="languageLabel"
            :title="languageLabel"
            @click="switchLanguage"
          >
            {{ languageLabel }}
          </button>

          <button
            type="button"
            class="theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition"
            :aria-label="nextColorModeLabel"
            :title="nextColorModeLabel"
            @click="toggleColorMode"
          >
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2.5v2" />
              <path d="M12 19.5v2" />
              <path d="m4.6 4.6 1.4 1.4" />
              <path d="m18 18 1.4 1.4" />
              <path d="M2.5 12h2" />
              <path d="M19.5 12h2" />
              <path d="m4.6 19.4 1.4-1.4" />
              <path d="m18 6 1.4-1.4" />
            </svg>

            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5" />
              <path d="M9.5 3.5A8.5 8.5 0 1 0 20.5 14.5" />
            </svg>
          </button>

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
                src="/assets/chlart-work-nav.png"
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
              :to="homePath"
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
              {{ copy.nav.home }}
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
              {{ copy.nav.allTools }}
            </NuxtLink>

            <NuxtLink
              to="/about"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              About
            </NuxtLink>

            <NuxtLink
              to="/guides"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Guides
            </NuxtLink>

            <NuxtLink
              to="/contact"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Contact
            </NuxtLink>

            <NuxtLink
              v-if="currentToolGuide"
              :to="currentToolGuide.path"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50"
              @click="closeMenu"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700"
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
                  <path d="M5 4h10l4 4v12H5V4Z" />
                  <path d="M14 4v5h5" />
                  <path d="M8 13h8" />
                  <path d="M8 16h6" />
                </svg>
              </span>
              Guide: {{ currentToolGuide.tool.name }}
            </NuxtLink>
          </nav>

          <div class="mt-4 px-3">
            <label for="mobile-tool-nav-search" class="sr-only">
              {{ copy.nav.searchTools }}
            </label>
            <div class="flex gap-2">
              <input
                id="mobile-tool-nav-search"
                v-model="toolNavSearch"
                type="search"
                class="h-11 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
                :placeholder="copy.nav.searchTools"
              />
              <button
                v-if="toolNavSearch"
                type="button"
                class="h-11 shrink-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                @click="toolNavSearch = ''"
              >
                {{ copy.nav.clear }}
              </button>
            </div>
          </div>

          <p
            v-if="filteredEnabledTools.length === 0"
            class="px-3 py-4 text-sm text-gray-500"
          >
            {{ copy.nav.noToolsFound }}
          </p>

          <div
            v-for="group in groupedEnabledTools"
            :key="group.category"
            class="mt-4"
          >
            <p
              class="px-3 pb-2 text-[11px] font-semibold uppercase text-gray-500"
            >
              {{ categoryLabel(group.category) }}
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
      <div :class="layoutGridClass">
        <!-- Desktop Sidebar -->
        <aside
          v-if="!isLandingPage"
          class="sidebar-scrollbar-hidden hidden max-h-[calc(100dvh-8rem)] overflow-y-auto self-start rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm shadow-sky-100/80 backdrop-blur md:sticky md:top-24 md:block dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/20"
        >
          <p class="mb-3 text-xs font-semibold uppercase text-gray-500">
            {{ copy.nav.toolsHeading }}
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
              <span>{{ copy.nav.allTools }}</span>
            </NuxtLink>

            <NuxtLink
              v-if="currentToolGuide"
              :to="currentToolGuide.path"
              class="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 dark:border-cyan-300/15 dark:bg-cyan-300/10 dark:text-cyan-200 dark:hover:bg-cyan-300/15"
            >
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm dark:bg-white/10 dark:text-cyan-200"
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
                  <path d="M5 4h10l4 4v12H5V4Z" />
                  <path d="M14 4v5h5" />
                  <path d="M8 13h8" />
                  <path d="M8 16h6" />
                </svg>
              </span>
              <span class="truncate">Guide: {{ currentToolGuide.tool.name }}</span>
            </NuxtLink>

            <div class="px-3 py-2">
              <label for="tool-nav-search" class="sr-only">
                {{ copy.nav.searchTools }}
              </label>
              <input
                id="tool-nav-search"
                v-model="toolNavSearch"
                type="search"
                class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
                :placeholder="copy.nav.searchTools"
              />
            </div>

            <p
              v-if="filteredEnabledTools.length === 0"
              class="px-3 py-4 text-sm text-gray-500"
            >
              {{ copy.nav.noToolsFound }}
            </p>

            <div
              v-for="group in groupedEnabledTools"
              :key="group.category"
              class="pt-3 first:pt-2"
            >
              <p
                class="px-3 pb-2 text-[11px] font-semibold uppercase text-gray-500"
              >
                {{ categoryLabel(group.category) }}
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
          <ToolPageDetails
            v-if="currentToolGuide?.guide && shouldShowToolPageDetails"
            :guide="currentToolGuide.guide"
          />
        </main>
      </div>
    </div>

    <!-- The footer keeps trust and policy links visible on every public page. -->
    <footer class="site-footer mt-0 border-t border-slate-200/70 py-8 dark:border-white/10">
      <div
        class="mx-auto grid max-w-[1440px] gap-8 px-3 text-sm sm:px-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)]"
      >
        <div class="max-w-xl space-y-3">
          <p class="text-base font-black text-slate-950 dark:text-white">
            ChlatWork
          </p>
          <p class="leading-6 text-gray-500 dark:text-white/60">
            ChlatWork provides simple online tools for documents, images, QR
            codes, barcodes, dates, and productivity.
          </p>
          <p class="text-xs text-gray-400 dark:text-white/40">
            © 2026 ChlatWork. Simple tools for everyday work.
          </p>
        </div>

        <div class="grid gap-6 sm:grid-cols-3">
          <nav class="space-y-3" aria-label="Footer site links">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
              Site
            </p>
            <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
              <NuxtLink to="/about" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.about }}
              </NuxtLink>
              <NuxtLink to="/contact" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.contact }}
              </NuxtLink>
              <NuxtLink to="/guides" class="hover:text-gray-900 dark:hover:text-white">
                Guides
              </NuxtLink>
              <a href="/sitemap.xml" class="hover:text-gray-900 dark:hover:text-white">
                Sitemap
              </a>
            </div>
          </nav>

          <nav class="space-y-3" aria-label="Footer policy links">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
              Policies
            </p>
            <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
              <NuxtLink to="/privacy-policy" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.privacy }}
              </NuxtLink>
              <NuxtLink to="/terms" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.terms }}
              </NuxtLink>
              <NuxtLink to="/cookies" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.cookies }}
              </NuxtLink>
              <NuxtLink to="/disclaimer" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.disclaimer }}
              </NuxtLink>
            </div>
          </nav>

          <div class="space-y-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35">
              Support
            </p>
            <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
              <button
                type="button"
                class="text-left hover:text-gray-900 dark:hover:text-white"
                @click="openPrivacyCookieSettings"
              >
                {{ copy.footer.cookieNotice }}
              </button>
              <NuxtLink to="/buy-me-coffee" class="hover:text-gray-900 dark:hover:text-white">
                {{ copy.footer.coffee }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
