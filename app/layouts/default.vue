<script setup lang="ts">
import {
  ALL_TOOLS_ICON_PATHS,
  ENABLED_TOOLS,
} from "~/lib/tool-registry";
import ToolPageDetails from "~/components/tools/ToolPageDetails.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import QuickExpenseFab from "~/components/expense-tracker/QuickExpenseFab.vue";
import FooterMenuGroup from "~/components/layout/FooterMenuGroup.vue";
import {
  STARTER_GUIDES,
  type StarterGuide,
} from "~/data/guides";
import { DEVELOPER_GUIDES } from "~/data/developer-guides";
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
    key: "page-developer-commands",
    title: "Developer Command Hub",
    description: "Search, customize, and copy Docker, Git, NestJS, Linux, database, and framework commands.",
    path: "/developer-commands",
    label: "Developer",
    searchText: "commands docker git nestjs npm pnpm yarn bun postgres redis linux nginx ssh network laravel vite typeorm pm2 github cli",
  },
  {
    key: "page-moments-create",
    title: "ChlatWork Moments",
    description: "Create an interactive celebration page with photos, a message, counter, and secret surprise.",
    path: "/moments/create",
    label: "Moments",
    searchText: "birthday anniversary love friendship celebration greeting photos surprise QR share",
  },
  {
    key: "page-developer-guides",
    title: "Developer Guides",
    description: "Production runbooks for Ubuntu, NestJS, Docker, AWS, PostgreSQL, Redis, Nginx, and SSL.",
    path: "/developer-guides",
    label: "Developer",
    searchText: "deployment guides production ubuntu nestjs pm2 nginx ssl docker compose aws ec2 postgresql redis security",
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

const { categoryLabel, copy, homePath, isKhmer, localizeTool } = useLanguage();
const footerMenuGroups = computed(() => [
  {
    title: "Site",
    ariaLabel: "Footer site links",
    items: [
      { label: copy.value.footer.about, to: "/about" },
      { label: copy.value.footer.contact, to: "/contact" },
      { label: "Guides", to: "/guides" },
      { label: "Posts", to: "/posts" },
      { label: "Sitemap", href: "/sitemap.xml" },
    ],
  },
  {
    title: "Policies",
    ariaLabel: "Footer policy links",
    items: [
      { label: "Editorial policy", to: "/editorial-policy" },
      { label: copy.value.footer.privacy, to: "/privacy-policy" },
      { label: copy.value.footer.terms, to: "/terms" },
      { label: copy.value.footer.cookies, to: "/cookies" },
      { label: copy.value.footer.disclaimer, to: "/disclaimer" },
    ],
  },
  {
    title: "Support",
    ariaLabel: "Footer support links",
    items: [
      { label: copy.value.footer.cookieNotice, action: "cookie-settings" },
      { label: copy.value.footer.coffee, to: "/buy-me-coffee" },
    ],
  },
]);

function handleFooterAction(action: string) {
  if (action === "cookie-settings") openPrivacyCookieSettings();
}

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
  const developerGuideResults = DEVELOPER_GUIDES.filter((guide) =>
    searchTextMatches(
      [guide.title, guide.summary, guide.metaDescription, ...guide.topics].join(" "),
      query,
    ),
  ).map((guide) => ({
    key: `developer-guide-${guide.slug}`,
    title: guide.title,
    description: guide.summary,
    path: guide.path,
    label: "Developer Guide",
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
    ...developerGuideResults,
    ...postResults,
    ...categoryResults,
    ...pageResults,
  ].slice(0, 12);
});
const allToolsIconPaths = ALL_TOOLS_ICON_PATHS;
const { isDark, nextColorModeLabel, toggleColorMode } = useColorMode();
const route = useRoute();
const { user: authUser, isReady: isAuthReady, fetchMe: fetchAuthUser } = useAuth();
// Do not branch on a session until the client has resolved it; server and hydration markup must match.
const visibleAuthUser = computed(() => isAuthReady.value ? authUser.value : null);
const { recordToolOpen } = useToolUsage();
const showHeaderLogin = ref(false);
const headerAvatarFailed = ref(false);
let lastTrackedToolPath = "";

const authUserInitials = computed(() => {
  const source = authUser.value?.name
    || authUser.value?.email
    || authUser.value?.phone
    || "U";

  return source
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "U";
});

function handleHeaderAvatarError() {
  headerAvatarFailed.value = true;
}

onMounted(() => {
  if (!isAuthReady.value) void fetchAuthUser();
});

watch(
  () => authUser.value?.avatarUrl,
  () => {
    // A later login may provide a different, valid profile image URL.
    headerAvatarFailed.value = false;
  },
);

watch(
  [() => route.path, isAuthReady, authUser],
  ([path, ready, user]) => {
    const tool = ENABLED_TOOLS.find((item) => item.route === path);

    if (!tool) {
      lastTrackedToolPath = "";
      return;
    }

    if (!ready || !user || lastTrackedToolPath === path) return;
    lastTrackedToolPath = path;
    void recordToolOpen(tool.key);
  },
  { immediate: true },
);
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
    class="flex min-h-[100dvh] flex-col bg-[var(--app-color-page-bg)] text-gray-900 dark:bg-black dark:text-white"
  >
    <!-- Top Task Bar -->
    <header class="site-header sticky top-0 z-50 border-b backdrop-blur">
      <div
        class="site-container flex items-center justify-between py-3"
      >
        <div class="flex items-center gap-3">
          <!-- Brand -->
          <NuxtLink
            :to="homePath"
            class="shrink-0 text-lg font-semibold tracking-tight leading-tight"
            @click="closeMenu"
          >
            ChlatWork
          </NuxtLink>

          <!-- Desktop Navigation -->
          <nav class="hidden items-center gap-1 text-sm sm:flex">
            <NuxtLink
              to="/tools"
              class="rounded-lg px-3 py-2 font-medium transition"
              :class="route.path.startsWith('/tools') ? 'bg-[#f0f9ff] text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300' : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'"
            >
              {{ copy.nav.tools }}
            </NuxtLink>
            <NuxtLink
              to="/guides"
              class="rounded-lg px-3 py-2 font-medium transition"
              :class="route.path.startsWith('/guides') || route.path.startsWith('/developer-guides') ? 'bg-[#f0f9ff] text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300' : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'"
            >
              Guides
            </NuxtLink>
            <NuxtLink
              to="/moments/create"
              class="rounded-lg px-3 py-2 font-medium transition"
              :class="route.path.startsWith('/moments') ? 'bg-rose-50 text-rose-700 dark:bg-rose-300/10 dark:text-rose-300' : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'"
            >
              Moments
            </NuxtLink>
            <NuxtLink
              to="/about"
              class="rounded-lg px-3 py-2 font-medium transition"
              :class="route.path === '/about' ? 'bg-[#f0f9ff] text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300' : 'text-slate-700 hover:bg-slate-100 dark:text-white/70 dark:hover:bg-white/10'"
            >
              About
            </NuxtLink>

          </nav>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2">
          <div
            v-if="route.path !== '/'"
            class="relative"
            @focusout="handleHeaderSearchFocusout"
          >
            <button
              ref="headerSearchButton"
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/15 dark:bg-black dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
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
              class="fixed inset-x-3 top-[4.5rem] z-[60] w-auto max-w-none overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:w-[calc(100vw-1.5rem)] sm:max-w-sm dark:border-white/15 dark:bg-black"
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
                class="max-h-[calc(100dvh-10rem)] overflow-y-auto p-2 sm:max-h-80"
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

          <NuxtLink
            v-if="visibleAuthUser"
            to="/account"
            class="hidden h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-sky-50 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:inline-flex dark:border-white/15 dark:bg-cyan-300/10 dark:text-cyan-200 dark:hover:bg-cyan-300/15"
            aria-label="Open account"
            title="Account"
          >
            <img
              v-if="authUser.avatarUrl && !headerAvatarFailed"
              :src="authUser.avatarUrl"
              alt=""
              class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
              @error="handleHeaderAvatarError"
            />
            <span v-else aria-hidden="true">{{ authUserInitials }}</span>
          </NuxtLink>

          <button
            v-else
            type="button"
            class="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:inline-flex dark:border-white/15 dark:bg-black dark:text-slate-100 dark:hover:bg-white/10"
            aria-label="Sign in"
            title="Sign in"
            @click="showHeaderLogin = true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
            </svg>
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
              class="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100"
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
              to="/moments/create"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-rose-50 hover:text-rose-700"
              @click="closeMenu"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600" aria-hidden="true">❤️</span>
              Moments
            </NuxtLink>

            <NuxtLink
              v-if="visibleAuthUser"
              to="/account"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-sky-50 hover:text-sky-700"
              @click="closeMenu"
            >
              <span class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-sky-50 text-xs font-semibold text-sky-700" aria-hidden="true">
                <img
                  v-if="authUser.avatarUrl && !headerAvatarFailed"
                  :src="authUser.avatarUrl"
                  alt=""
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer"
                  @error="handleHeaderAvatarError"
                />
                <span v-else>{{ authUserInitials }}</span>
              </span>
              Account
            </NuxtLink>

            <button
              v-else
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-sky-50 hover:text-sky-700"
              @click="closeMenu(); showHeaderLogin = true"
            >
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>
              </span>
              Sign in
            </button>

            <NuxtLink
              to="/guides"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Guides
            </NuxtLink>

          </nav>
        </div>
      </aside>
    </div>

    <!-- ✅ Content wrapper grows to push footer to bottom -->
    <div class="flex-1">
      <!-- Layout body -->
      <div class="site-container grid gap-6 py-5">
        <!-- Page content stays focused; discovery remains in search and the tools directory. -->
        <main class="site-content min-w-0">
          <div
            v-if="currentToolGuide?.tool"
            :class="route.path === '/tools/expense-tracker'
              ? 'mb-3 hidden justify-end sm:flex'
              : 'mb-3 flex justify-end'"
            aria-label="Tool actions"
          >
            <ToolFavoriteButton
              :tool-key="currentToolGuide.tool.key"
              :tool-name="currentToolGuide.tool.name"
              show-label
            />
          </div>
          <slot />
          <ToolPageDetails
            v-if="currentToolGuide?.guide && shouldShowToolPageDetails"
            :class="route.path === '/tools/expense-tracker' ? 'hidden sm:block' : undefined"
            :guide="currentToolGuide.guide"
          />
        </main>
      </div>
    </div>

    <AuthLoginDialog :open="showHeaderLogin" @close="showHeaderLogin = false" />
    <!-- The tracker already exposes its primary form, so a second floating action would compete with it. -->
    <QuickExpenseFab v-if="visibleAuthUser && route.path !== '/tools/expense-tracker'" />

    <!-- The footer keeps trust and policy links visible on every public page. -->
    <footer
      class="site-footer mt-0 border-t border-slate-200/70 py-4 dark:border-white/10 sm:py-8"
      :class="{ 'hidden sm:block': route.path === '/tools/expense-tracker' }"
    >
      <div
        class="site-container grid text-sm sm:gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)]"
      >
        <div class="flex max-w-xl items-center justify-between gap-4 sm:block sm:space-y-3">
          <p class="text-base font-black text-slate-950 dark:text-white">
            ChlatWork
          </p>
          <p class="hidden leading-6 text-gray-500 dark:text-white/60 sm:block">
            ChlatWork provides simple online tools for documents, images, QR
            codes, barcodes, dates, and productivity.
          </p>
          <p class="text-xs text-gray-400 dark:text-white/40">
            © 2026 ChlatWork.
          </p>
        </div>

        <div class="hidden sm:grid sm:grid-cols-3 sm:gap-6">
          <FooterMenuGroup
            v-for="group in footerMenuGroups"
            :key="group.title"
            :title="group.title"
            :aria-label="group.ariaLabel"
            :items="group.items"
            @action="handleFooterAction"
          />
        </div>
      </div>
    </footer>
  </div>
</template>
