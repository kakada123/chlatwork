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

const baseClass = "mobile-pressable group flex min-h-14 flex-col items-center justify-center gap-1 rounded-[1.35rem] px-1.5 py-1.5 text-[10px] leading-none transition-[background-color,color,box-shadow,transform] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500";
const inactiveClass = "font-semibold text-slate-500 hover:bg-slate-100/80 dark:text-white/55 dark:hover:bg-white/[0.08]";
const activeClass = "bg-slate-200/90 font-bold text-sky-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_5px_14px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.04] dark:bg-white/[0.14] dark:text-sky-400 dark:ring-white/10";
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
    class="fixed inset-x-3 z-50 sm:hidden"
    style="bottom: max(0.5rem, env(safe-area-inset-bottom))"
    aria-label="Mobile primary navigation"
  >
    <div
      class="mx-auto grid max-w-md gap-1 rounded-[2rem] border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_14px_40px_rgba(15,23,42,0.20)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#17191d]/85 dark:shadow-[0_16px_44px_rgba(0,0,0,0.48)]"
      :class="showQuickExpenseSlot ? 'grid-cols-5' : 'grid-cols-4'"
    >
      <NuxtLink
        to="/"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isHomeActive ? activeClass : inactiveClass]"
        :aria-current="isHomeActive ? 'page' : undefined"
      >
        <Home class="size-5 transition-transform" :class="{ 'mobile-nav-icon-active scale-110': isHomeActive }" aria-hidden="true" /> Home
      </NuxtLink>

      <NuxtLink
        to="/tools"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isToolsActive ? activeClass : inactiveClass]"
        :aria-current="isToolsActive ? 'page' : undefined"
      >
        <Wrench class="size-5 transition-transform" :class="{ 'mobile-nav-icon-active scale-110': isToolsActive }" aria-hidden="true" /> Tools
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
        <Search class="size-5 transition-transform" :class="{ 'scale-110': props.searchActive }" aria-hidden="true" /> Search
      </button>

      <NuxtLink
        :to="accountTo"
        :external="props.forceDocumentNavigation"
        :class="[baseClass, isAccountActive ? activeClass : inactiveClass]"
        :aria-current="isAccountActive ? 'page' : undefined"
      >
        <UserRound class="size-5 transition-transform" :class="{ 'mobile-nav-icon-active scale-110': isAccountActive }" aria-hidden="true" /> Account
      </NuxtLink>
    </div>
  </nav>
</template>
