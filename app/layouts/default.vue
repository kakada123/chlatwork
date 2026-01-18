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
              class="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
              Home
            </NuxtLink>

            <NuxtLink
              to="/tools"
              class="flex items-center rounded-xl px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
              @click="closeMenu"
            >
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
                class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-gray-100"
                active-class="bg-gray-900 text-white hover:bg-gray-900"
                @click="closeMenu"
              >
                <span class="min-w-0 truncate">{{ t.name }}</span>

                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                  :class="badgeClass(t.status)"
                >
                  {{ t.status }}
                </span>
              </NuxtLink>
            </nav>
          </div>

          <!-- Coming soon -->
          <div class="mt-5">
            <p
              class="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              Coming soon
            </p>

            <div
              v-for="t in comingSoon"
              :key="t.key"
              class="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-gray-400"
            >
              <span class="min-w-0 truncate">{{ t.name }}</span>
              <span
                class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px]"
              >
                soon
              </span>
            </div>
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

    <!-- ✅ Footer now sticks to bottom -->
    <footer class="mt-0 border-t bg-white py-6">
      <div
        class="mx-auto flex max-w-6xl flex-wrap gap-4 px-4 text-sm text-gray-500 sm:px-6"
      >
        <NuxtLink to="/about" class="hover:text-gray-900">About</NuxtLink>
        <NuxtLink to="/privacy" class="hover:text-gray-900"
          >Privacy Policy</NuxtLink
        >
        <NuxtLink to="/terms" class="hover:text-gray-900">Terms</NuxtLink>
        <NuxtLink to="/disclaimer" class="hover:text-gray-900"
          >Disclaimer</NuxtLink
        >
        <NuxtLink to="/contact" class="hover:text-gray-900">Contact</NuxtLink>

        <!-- ☕ Support -->
        <NuxtLink to="/payme" class="hover:text-gray-900 font-medium">
          Buy me a coffee ☕
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>
