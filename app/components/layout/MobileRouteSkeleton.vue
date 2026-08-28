<script setup lang="ts">
const props = defineProps<{
  hasSharedHeader: boolean;
}>();

const nuxtApp = useNuxtApp();
const isNavigating = ref(false);
const isVisible = ref(false);
let revealTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
let visibleSince = 0;

const REVEAL_DELAY_MS = 120;
const MIN_VISIBLE_MS = 240;

function clearTimers() {
  if (revealTimer) clearTimeout(revealTimer);
  if (hideTimer) clearTimeout(hideTimer);
  revealTimer = undefined;
  hideTimer = undefined;
}

function startLoading() {
  clearTimers();
  isNavigating.value = true;

  if (isVisible.value) {
    visibleSince = Date.now();
    return;
  }

  // Fast client-side routes should feel instant; the skeleton is reserved for work users can perceive.
  revealTimer = setTimeout(() => {
    if (!isNavigating.value) return;
    visibleSince = Date.now();
    isVisible.value = true;
  }, REVEAL_DELAY_MS);
}

function finishLoading() {
  isNavigating.value = false;
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = undefined;

  if (!isVisible.value) return;

  const remainingDuration = Math.max(0, MIN_VISIBLE_MS - (Date.now() - visibleSince));
  hideTimer = setTimeout(() => {
    isVisible.value = false;
    hideTimer = undefined;
  }, remainingDuration);
}

const removePageStartHook = nuxtApp.hook("page:start", startLoading);
const removePageFinishHook = nuxtApp.hook("page:finish", finishLoading);
const removeAppErrorHook = nuxtApp.hook("app:error", finishLoading);

onBeforeUnmount(() => {
  clearTimers();
  removePageStartHook();
  removePageFinishHook();
  removeAppErrorHook();
});
</script>

<template>
  <Transition name="mobile-skeleton-screen">
    <div
      v-if="isVisible"
      class="fixed inset-x-0 z-30 overflow-hidden bg-[var(--app-color-page-bg)] sm:hidden"
      :class="props.hasSharedHeader ? 'top-16' : 'top-0'"
      style="bottom: calc(4.75rem + env(safe-area-inset-bottom))"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <span class="sr-only">Loading page…</span>
      <div class="mx-auto h-full w-full max-w-md overflow-hidden px-4 pt-4" aria-hidden="true">
        <div v-if="!props.hasSharedHeader" class="flex items-center justify-between gap-4">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="mobile-skeleton h-7 w-40 rounded-lg" />
            <div class="mobile-skeleton h-3 w-28 rounded-full" />
          </div>
          <div class="flex gap-2">
            <div class="mobile-skeleton size-11 rounded-full" />
            <div class="mobile-skeleton size-11 rounded-full" />
          </div>
        </div>

        <div class="mobile-skeleton mt-6 h-12 w-full rounded-2xl" />
        <div class="mt-4 flex gap-2">
          <div class="mobile-skeleton h-10 w-20 shrink-0 rounded-full" />
          <div class="mobile-skeleton h-10 w-28 shrink-0 rounded-full" />
          <div class="mobile-skeleton h-10 w-24 shrink-0 rounded-full" />
        </div>
        <div class="mobile-skeleton mt-6 h-40 w-full rounded-3xl" />
        <div class="mt-7 flex items-center justify-between">
          <div class="mobile-skeleton h-5 w-32 rounded-md" />
          <div class="mobile-skeleton h-3 w-12 rounded-full" />
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div v-for="index in 4" :key="index" class="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <div class="mobile-skeleton size-10 rounded-xl" />
            <div class="mobile-skeleton mt-4 h-4 w-3/4 rounded-md" />
            <div class="mobile-skeleton mt-2 h-3 w-1/2 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
