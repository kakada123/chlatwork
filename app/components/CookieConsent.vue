<template>
  <Teleport to="body">
    <section
      v-if="isNoticeVisible"
      class="fixed inset-x-2 bottom-2 z-[70] mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white/95 px-3 py-2.5 text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:text-white sm:inset-x-4 sm:bottom-3 sm:px-4"
      role="region"
      aria-label="Cookie notice"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
        <p class="min-w-0 flex-1 text-xs leading-5 text-slate-600 dark:text-white/70 sm:text-sm">
          ChlatWork may use cookies and local storage for preferences, analytics,
          and ads. Where required, a certified consent message may ask for your
          ad cookie choices.
          <NuxtLink
            to="/privacy-policy"
            class="whitespace-nowrap font-semibold text-slate-900 underline underline-offset-2 dark:text-white"
          >
            Privacy Policy
          </NuxtLink>
          <span class="text-slate-400">·</span>
          <NuxtLink
            to="/cookies"
            class="whitespace-nowrap font-semibold text-slate-900 underline underline-offset-2 dark:text-white"
          >
            Cookie Policy
          </NuxtLink>
        </p>

        <div class="flex shrink-0 items-center gap-2 self-start">
          <button
            type="button"
            class="inline-flex h-8 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
            @click="openPrivacyCookieSettings"
          >
            Privacy & cookie settings
          </button>

          <button
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close cookie notice"
            @click="dismissCookieNotice"
          >
            <span class="text-base leading-none" aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </section>
  </Teleport>
</template>

<script setup lang="ts">
import {
  COOKIE_NOTICE_OPEN_EVENT,
  openPrivacyCookieSettings,
} from "~/lib/cookie-notice";

const {
  dismissCookieNotice,
  initializeCookieNotice,
  isNoticeVisible,
  showCookieNotice,
} = useCookieNotice();

onMounted(() => {
  initializeCookieNotice();
  window.addEventListener(COOKIE_NOTICE_OPEN_EVENT, showCookieNotice);
});

onBeforeUnmount(() => {
  window.removeEventListener(COOKIE_NOTICE_OPEN_EVENT, showCookieNotice);
});
</script>
