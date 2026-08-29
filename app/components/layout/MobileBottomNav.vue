<script setup lang="ts">
import { Home, Search, UserRound, Wrench } from "lucide-vue-next";

const props = defineProps<{
  routePath: string;
  accountTo: string;
  showQuickExpenseSlot: boolean;
  searchActive?: boolean;
  forceDocumentNavigation?: boolean;
}>();

const emit = defineEmits<{
  search: [];
}>();

const baseClass = "mobile-pressable flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] transition-[background-color,color,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";
const inactiveClass = "font-medium text-slate-600 dark:text-white/60";
const activeClass = "bg-sky-50 font-semibold text-[#082552] dark:bg-white/[0.10] dark:text-white";
// Search is a shell-level destination, so it exclusively owns the active state while open.
const isHomeActive = computed(
  () => !props.searchActive && (props.routePath === "/" || props.routePath === "/km"),
);
const isToolsActive = computed(
  () => !props.searchActive && props.routePath.startsWith("/tools"),
);
const isAccountActive = computed(
  () => !props.searchActive && (props.routePath === "/account" || props.routePath === "/login"),
);
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-black/95 sm:hidden"
    style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom))"
    aria-label="Mobile primary navigation"
  >
    <div class="mx-auto grid max-w-md gap-1" :class="showQuickExpenseSlot ? 'grid-cols-5' : 'grid-cols-4'">
      <NuxtLink
        to="/"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isHomeActive ? activeClass : inactiveClass]"
        :aria-current="isHomeActive ? 'page' : undefined"
      >
        <Home class="size-5" :class="{ 'mobile-nav-icon-active': isHomeActive }" aria-hidden="true" /> Home
      </NuxtLink>

      <NuxtLink
        to="/tools"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isToolsActive ? activeClass : inactiveClass]"
        :aria-current="isToolsActive ? 'page' : undefined"
      >
        <Wrench class="size-5" :class="{ 'mobile-nav-icon-active': isToolsActive }" aria-hidden="true" /> Tools
      </NuxtLink>

      <!-- Quick Expense owns the centered circular action above this reserved column. -->
      <span v-if="showQuickExpenseSlot" aria-hidden="true" />

      <button
        type="button"
        :class="[baseClass, props.searchActive ? activeClass : inactiveClass, 'w-full']"
        aria-label="Search ChlatWork"
        :aria-pressed="props.searchActive === true"
        @click="emit('search')"
      >
        <Search class="size-5" aria-hidden="true" /> Search
      </button>

      <NuxtLink
        :to="accountTo"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isAccountActive ? activeClass : inactiveClass]"
        :aria-current="isAccountActive ? 'page' : undefined"
      >
        <UserRound class="size-5" :class="{ 'mobile-nav-icon-active': isAccountActive }" aria-hidden="true" /> Account
      </NuxtLink>
    </div>
  </nav>
</template>
