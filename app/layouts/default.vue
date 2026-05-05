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

const allToolsIconPaths = [
  "M4 5h7v7H4V5Z",
  "M13 5h7v7h-7V5Z",
  "M4 14h7v5H4v-5Z",
  "M13 14h7v5h-7v-5Z",
];

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
  calculator: "bg-blue-50 text-blue-700",
  qr: "bg-emerald-50 text-emerald-700",
  "wifi-qr": "bg-cyan-50 text-cyan-700",
  "payback-calculator": "bg-amber-50 text-amber-700",
  "expense-tracker": "bg-rose-50 text-rose-700",
  barcode: "bg-slate-100 text-slate-700",
  "image-compress": "bg-violet-50 text-violet-700",
  "lucky-draw": "bg-fuchsia-50 text-fuchsia-700",
};

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
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"
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

          <!-- Enabled -->
          <div class="mt-4">
            <p
              class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              Enabled
            </p>

            <nav class="space-y-1">
              <NuxtLink
                v-for="t in enabledTools"
                :key="t.key"
                :to="t.route"
                class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
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
                      v-for="path in toolIconPaths[t.key] || toolIconPaths.calculator"
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
        class="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[260px_1fr]"
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

            <NuxtLink
              v-for="t in enabledTools"
              :key="t.key"
              :to="t.route"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-gray-100"
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
                    v-for="path in toolIconPaths[t.key] || toolIconPaths.calculator"
                    :key="path"
                    :d="path"
                  />
                </svg>
              </span>
              <span class="truncate">{{ t.name }}</span>
            </NuxtLink>
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
        class="mx-auto max-w-6xl px-4 text-sm sm:px-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
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
