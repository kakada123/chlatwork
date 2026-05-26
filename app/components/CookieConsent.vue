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

    <div
      v-if="isSettingsVisible"
      class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      @click.self="closeCookieSettings"
    >
      <section
        class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-slate-950 dark:text-white sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1">
            <h2 id="cookie-settings-title" class="text-base font-semibold">
              Privacy & cookie settings
            </h2>
            <p class="text-sm leading-6 text-slate-600 dark:text-white/70">
              ChlatWork uses local storage for preferences, and may use analytics
              and ads services. Google&apos;s consent panel appears here when it is
              available for your region and browser.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close privacy and cookie settings"
            @click="closeCookieSettings"
          >
            <span class="text-base leading-none" aria-hidden="true">×</span>
          </button>
        </div>

        <div class="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-white/70">
          <p>
            You can review ChlatWork&apos;s cookie details, manage ad
            personalization through Google, or change browser cookie and local
            storage permissions.
          </p>
        </div>

        <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <NuxtLink
            to="/cookies"
            class="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
            @click="closeCookieSettings"
          >
            Cookie Policy
          </NuxtLink>

          <a
            href="https://myadcenter.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Google ad settings
          </a>

          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-white dark:text-slate-950 dark:hover:bg-white/80"
            @click="closeCookieSettings"
          >
            Done
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  COOKIE_NOTICE_OPEN_EVENT,
  COOKIE_SETTINGS_OPEN_EVENT,
  openPrivacyCookieSettings,
} from "~/lib/cookie-notice";

const {
  dismissCookieNotice,
  initializeCookieNotice,
  isNoticeVisible,
  showCookieNotice,
} = useCookieNotice();

const isSettingsVisible = ref(false);

const showCookieSettings = () => {
  isSettingsVisible.value = true;
};

const closeCookieSettings = () => {
  isSettingsVisible.value = false;
};

onMounted(() => {
  initializeCookieNotice();
  window.addEventListener(COOKIE_NOTICE_OPEN_EVENT, showCookieNotice);
  window.addEventListener(COOKIE_SETTINGS_OPEN_EVENT, showCookieSettings);
});

onBeforeUnmount(() => {
  window.removeEventListener(COOKIE_NOTICE_OPEN_EVENT, showCookieNotice);
  window.removeEventListener(COOKIE_SETTINGS_OPEN_EVENT, showCookieSettings);
});
</script>
