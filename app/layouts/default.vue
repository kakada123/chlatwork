<script setup lang="ts">
import {
  ALL_TOOLS_ICON_PATHS,
  ENABLED_TOOLS,
  TOOL_ICON_CLASSES,
  TOOL_ICON_PATHS,
  type ToolDef,
} from "~/lib/tool-registry";
import ToolPageDetails from "~/components/tools/ToolPageDetails.vue";
import { getToolIconImagePath } from "~/lib/icon-assets";
import {
  STARTER_GUIDES,
  findStarterGuideByPath,
  type StarterGuide,
} from "~/data/guides";
import {
  findToolGuideByToolRoute,
} from "~/data/tool-guides";
import { TOOL_DIRECTORY_CATEGORIES } from "~/data/tool-categories";
import { POSTS } from "~/data/posts";
import { openPrivacyCookieSettings } from "~/lib/cookie-notice";
import { filterTools, searchTextMatches } from "~/lib/tool-search";

type HeaderSearchResult = {
  key: string;
  title: string;
  description: string;
  path: string;
  label: string;
  searchText: string;
};

const SITE_SEARCH_PAGES: HeaderSearchResult[] = [
  {
    key: "page-home",
    title: "Home",
    description: "Explore ChlatWork tools, categories, and popular workflows.",
    path: "/",
    label: "Page",
    searchText: "home ChlatWork online tools popular tools categories",
  },
  {
    key: "page-tools",
    title: "All Tools",
    description: "Browse every available ChlatWork tool.",
    path: "/tools",
    label: "Page",
    searchText: "all tools directory utilities pdf developer tools",
  },
  {
    key: "page-guides",
    title: "Guides",
    description: "Browse practical guides for ChlatWork tools and workflows.",
    path: "/guides",
    label: "Page",
    searchText: "guides tutorials help how to instructions",
  },
  {
    key: "page-posts",
    title: "Posts",
    description: "Read ChlatWork technology and business briefings.",
    path: "/posts",
    label: "Page",
    searchText: "posts news daily briefing AI technology business Cambodia markets",
  },
  {
    key: "page-about",
    title: "About ChlatWork",
    description: "Learn about ChlatWork and its browser-based tools.",
    path: "/about",
    label: "Page",
    searchText: "about ChlatWork company website mission",
  },
  {
    key: "page-contact",
    title: "Contact",
    description: "Contact ChlatWork for questions, support, or services.",
    path: "/contact",
    label: "Page",
    searchText: "contact support message Telegram email help",
  },
  {
    key: "page-editorial-policy",
    title: "Editorial Policy",
    description: "Read the standards used for ChlatWork content and guides.",
    path: "/editorial-policy",
    label: "Policy",
    searchText: "editorial policy content standards review",
  },
  {
    key: "page-privacy",
    title: "Privacy Policy",
    description: "Review how ChlatWork handles privacy and data.",
    path: "/privacy-policy",
    label: "Policy",
    searchText: "privacy policy data processing personal information",
  },
  {
    key: "page-terms",
    title: "Terms",
    description: "Read the terms for using ChlatWork.",
    path: "/terms",
    label: "Policy",
    searchText: "terms conditions legal use",
  },
  {
    key: "page-cookies",
    title: "Cookie Policy",
    description: "Review ChlatWork cookie and local-storage information.",
    path: "/cookies",
    label: "Policy",
    searchText: "cookies cookie settings local storage analytics",
  },
  {
    key: "page-disclaimer",
    title: "Disclaimer",
    description: "Read the ChlatWork website and tool disclaimer.",
    path: "/disclaimer",
    label: "Policy",
    searchText: "disclaimer limitations legal information",
  },
  {
    key: "page-buy-me-coffee",
    title: "Buy Me a Coffee",
    description: "Support the continued development of ChlatWork.",
    path: "/buy-me-coffee",
    label: "Page",
    searchText: "support donate donation coffee",
  },
];

const toolNavSearch = ref("");
const { categoryLabel, copy, homePath, isKhmer, localizeTool } = useLanguage();
const localizedEnabledTools = computed(() => ENABLED_TOOLS.map(localizeTool));
const headerToolSearch = ref("");
const isHeaderSearchOpen = ref(false);
const headerSearchInput = ref<HTMLInputElement | null>(null);
const headerSearchButton = ref<HTMLButtonElement | null>(null);
const headerSearchLabel = computed(() =>
  isKhmer.value ? "ស្វែងរកក្នុង ChlatWork" : "Search ChlatWork",
);
const headerSearchResults = computed(() => {
  const query = headerToolSearch.value.trim();

  if (!query) {
    return [];
  }

  const toolResults: HeaderSearchResult[] = filterTools(
    localizedEnabledTools.value,
    query,
  ).map((tool) => ({
    key: `tool-${tool.key}`,
    title: tool.name,
    description: tool.description,
    path: tool.route,
    label: categoryLabel(tool.category),
    searchText: "",
  }));
  const starterGuideResults = STARTER_GUIDES.filter((guide) =>
    searchTextMatches(getStarterGuideSearchText(guide), query),
  ).map((guide) => ({
    key: `starter-guide-${guide.slug}`,
    title: guide.title,
    description: guide.metaDescription,
    path: guide.path,
    label: "Guide",
    searchText: "",
  }));
  const postResults = POSTS.filter((post) =>
    searchTextMatches(
      [
        post.title,
        post.description,
        post.dek,
        ...post.sections.flatMap((section) => [
          section.category,
          section.title,
          ...section.paragraphs,
        ]),
      ].join(" "),
      query,
    ),
  ).map((post) => ({
    key: `post-${post.slug}`,
    title: post.title,
    description: post.description,
    path: post.path,
    label: "Post",
    searchText: "",
  }));
  const categoryResults = TOOL_DIRECTORY_CATEGORIES.filter((category) =>
    searchTextMatches(
      [
        category.name,
        category.title,
        category.description,
        category.intro,
        ...category.toolKeys,
      ].join(" "),
      query,
    ),
  ).map((category) => ({
    key: `category-${category.key}`,
    title: category.title,
    description: category.description,
    path: category.path,
    label: "Category",
    searchText: "",
  }));
  const pageResults = SITE_SEARCH_PAGES.filter((page) =>
    searchTextMatches(
      [page.title, page.description, page.path, page.searchText].join(" "),
      query,
    ),
  );

  return [
    ...toolResults,
    ...starterGuideResults,
    ...postResults,
    ...categoryResults,
    ...pageResults,
  ].slice(0, 12);
});
const filteredEnabledTools = computed(() =>
  filterTools(localizedEnabledTools.value, toolNavSearch.value),
);
const groupedEnabledTools = computed(() =>
  groupTools(filteredEnabledTools.value),
);
const allToolsIconPaths = ALL_TOOLS_ICON_PATHS;
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const route = useRoute();
// The tools index is a catalog page, so it gets the full-width layout instead of the shared sidebar.
const isToolsIndexPage = computed(() => route.path === "/tools");
const isPortfolioPage = computed(() => route.path === "/portfolio");
const isBusinessPage = computed(
  () => route.path === "/pricing" || route.path.startsWith("/services/"),
);
const isStarterGuidePage = computed(
  () => route.path === "/guides" || Boolean(findStarterGuideByPath(route.path)),
);
const isPostPage = computed(
  () => route.path === "/posts" || route.path.startsWith("/posts/"),
);
const isContactPage = computed(() => route.path === "/contact");
const currentToolGuide = computed(() => {
  const currentTool = ENABLED_TOOLS.find((tool) => tool.route === route.path);

  if (!currentTool) {
    return null;
  }

  return {
    guide: findToolGuideByToolRoute(currentTool.route),
    tool: currentTool,
  };
});
const shouldShowToolPageDetails = computed(
  () => currentToolGuide.value?.tool.category !== "PDF Tools",
);
const isLandingPage = computed(
  () =>
    route.path === "/" ||
    isToolsIndexPage.value ||
    isPortfolioPage.value ||
    isBusinessPage.value ||
    isStarterGuidePage.value ||
    isPostPage.value ||
    isContactPage.value,
);
const layoutGridClass = computed(() =>
  isLandingPage.value
    ? "mx-auto grid max-w-[1440px] gap-6 px-3 py-4 sm:px-4"
    : "mx-auto grid max-w-[1440px] items-start gap-6 px-3 py-6 sm:px-4 md:grid-cols-[320px_1fr]",
);

function getStarterGuideSearchText(guide: StarterGuide) {
  return [
    guide.title,
    guide.metaTitle,
    guide.metaDescription,
    guide.summary,
    guide.primaryTool.label,
    ...guide.relatedTools.map((tool) => tool.label),
    ...guide.keywords,
    guide.path,
  ].join(" ");
}

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

async function toggleHeaderSearch() {
  isHeaderSearchOpen.value = !isHeaderSearchOpen.value;

  if (isHeaderSearchOpen.value) {
    await nextTick();
    headerSearchInput.value?.focus();
  }
}

function closeHeaderSearch(restoreFocus = false) {
  isHeaderSearchOpen.value = false;
  headerToolSearch.value = "";

  if (restoreFocus) {
    nextTick(() => headerSearchButton.value?.focus());
  }
}

function handleHeaderSearchFocusout(event: FocusEvent) {
  const searchContainer = event.currentTarget as HTMLElement;
  const nextTarget = event.relatedTarget as Node | null;

  if (nextTarget && searchContainer.contains(nextTarget)) {
    return;
  }

  closeHeaderSearch();
}

function openFirstHeaderSearchResult() {
  const firstResult = headerSearchResults.value[0];

  if (!firstResult) {
    return;
  }

  closeHeaderSearch();
  navigateTo(firstResult.path);
}

watch(
  () => route.fullPath,
  () => {
    closeMenu();
    closeHeaderSearch();
  },
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
    class="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-black dark:text-white"
  >
    <!-- Top Task Bar -->
    <header class="site-header sticky top-0 z-50 border-b backdrop-blur">
      <div
        class="mx-auto flex max-w-[1440px] items-center justify-between px-3 py-3 sm:px-4"
      >
        <div class="flex items-center gap-3">
          <!-- Brand -->
          <NuxtLink
            :to="homePath"
            class="shrink-0 text-sm font-semibold leading-tight"
            @click="closeMenu"
          >
            ChlatWork
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
              to="/posts"
              class="rounded-lg px-3 py-2 transition hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Posts
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
        </div>

        <div class="flex items-center gap-2">
          <div
            class="relative"
            @focusout="handleHeaderSearchFocusout"
          >
            <button
              ref="headerSearchButton"
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/15 bg-white text-slate-900 shadow-sm transition hover:bg-black hover:text-white dark:border-white/15 dark:bg-black dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
              :aria-label="headerSearchLabel"
              :title="headerSearchLabel"
              aria-controls="header-tool-search"
              :aria-expanded="isHeaderSearchOpen"
              @click="toggleHeaderSearch"
            >
              <svg
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
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>

            <div
              v-if="isHeaderSearchOpen"
              id="header-tool-search"
              class="absolute right-0 top-[calc(100%+0.75rem)] w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/15 dark:bg-black"
              role="search"
            >
              <div class="border-b border-black/10 p-3 dark:border-white/10">
                <label for="header-tool-search-input" class="sr-only">
                  {{ headerSearchLabel }}
                </label>
                <input
                  id="header-tool-search-input"
                  ref="headerSearchInput"
                  v-model="headerToolSearch"
                  type="search"
                  class="h-11 w-full rounded-xl border border-black/15 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-300 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:ring-cyan-300"
                  :placeholder="headerSearchLabel"
                  @keydown.enter.prevent="openFirstHeaderSearchResult"
                  @keydown.esc.prevent="closeHeaderSearch(true)"
                />
              </div>

              <div
                v-if="headerToolSearch.trim()"
                class="max-h-80 overflow-y-auto p-2"
              >
                <NuxtLink
                  v-for="result in headerSearchResults"
                  :key="result.key"
                  :to="result.path"
                  class="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-300 dark:hover:bg-white/10 dark:focus:ring-cyan-300"
                  @click="closeHeaderSearch()"
                >
                  <span class="min-w-0 truncate font-semibold">
                    {{ result.title }}
                  </span>
                  <span class="shrink-0 text-xs text-gray-500 dark:text-white/50">
                    {{ result.label }}
                  </span>
                </NuxtLink>

                <p
                  v-if="headerSearchResults.length === 0"
                  class="px-3 py-4 text-center text-sm text-gray-500 dark:text-white/50"
                >
                  {{ copy.nav.noToolsFound }}
                </p>
              </div>
            </div>
          </div>

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
            <p class="truncate text-sm font-semibold">ChlatWork</p>

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
              to="/posts"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Posts
            </NuxtLink>

            <NuxtLink
              to="/contact"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Contact
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
                active-class="bg-gray-900 text-white hover:bg-gray-900 dark:!bg-white dark:!text-slate-950 dark:hover:!bg-slate-100"
                @click="closeMenu"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm ring-1 ring-black/5"
                  aria-hidden="true"
                >
                  <img
                    :src="getToolIconImagePath(t.key)"
                    alt=""
                    aria-hidden="true"
                    class="h-7 w-7 rounded-md object-contain"
                    decoding="async"
                  />
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
              active-class="bg-gray-900 text-white hover:bg-gray-900 dark:!bg-white dark:!text-slate-950 dark:hover:!bg-slate-100"
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
                active-class="bg-gray-900 text-white hover:bg-gray-900 dark:!bg-white dark:!text-slate-950 dark:hover:!bg-slate-100"
              >
                <span
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-black/5 transition dark:ring-white/10"
                  :class="TOOL_ICON_CLASSES[t.key]"
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
                      v-for="path in TOOL_ICON_PATHS[t.key] ?? ALL_TOOLS_ICON_PATHS"
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
    <footer
      class="site-footer mt-0 border-t border-slate-200/70 py-8 dark:border-white/10"
    >
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
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35"
            >
              Site
            </p>
            <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
              <NuxtLink
                to="/about"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.about }}
              </NuxtLink>
              <NuxtLink
                to="/contact"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.contact }}
              </NuxtLink>
              <NuxtLink
                to="/guides"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                Guides
              </NuxtLink>
              <NuxtLink
                to="/posts"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                Posts
              </NuxtLink>
              <a
                href="/sitemap.xml"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                Sitemap
              </a>
            </div>
          </nav>

          <nav class="space-y-3" aria-label="Footer policy links">
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35"
            >
              Policies
            </p>
            <div class="flex flex-col gap-2 text-gray-500 dark:text-white/55">
              <NuxtLink
                to="/editorial-policy"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                Editorial policy
              </NuxtLink>
              <NuxtLink
                to="/privacy-policy"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.privacy }}
              </NuxtLink>
              <NuxtLink
                to="/terms"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.terms }}
              </NuxtLink>
              <NuxtLink
                to="/cookies"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.cookies }}
              </NuxtLink>
              <NuxtLink
                to="/disclaimer"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.disclaimer }}
              </NuxtLink>
            </div>
          </nav>

          <div class="space-y-3">
            <p
              class="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white/35"
            >
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
              <NuxtLink
                to="/buy-me-coffee"
                class="hover:text-gray-900 dark:hover:text-white"
              >
                {{ copy.footer.coffee }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
