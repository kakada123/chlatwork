<template>
  <Teleport to="body">
    <section
      v-if="isBannerVisible"
      class="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-800 shadow-2xl shadow-slate-900/15 backdrop-blur dark:border-white/10 dark:bg-slate-950/95 dark:text-white sm:bottom-4 sm:p-5"
      role="region"
      aria-label="Cookie consent"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p class="max-w-3xl text-sm leading-6 text-slate-600 dark:text-white/70">
          We use cookies to improve your experience, analyze traffic, and support ads. You can accept all cookies, reject optional cookies, or manage your preferences.
        </p>

        <div class="flex flex-row flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/10"
            @click="openSettings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 21v-7" />
              <path d="M4 10V3" />
              <path d="M12 21v-9" />
              <path d="M12 8V3" />
              <path d="M20 21v-5" />
              <path d="M20 12V3" />
              <path d="M2 14h4" />
              <path d="M10 8h4" />
              <path d="M18 16h4" />
            </svg>
            Manage Settings
          </button>
          <button
            type="button"
            class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/10"
            @click="rejectOptional"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            Reject Optional
          </button>
          <button
            type="button"
            class="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            @click="acceptAll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Accept All
          </button>
        </div>
      </div>
    </section>

    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center"
      role="presentation"
      @click.self="closeSettings"
      @keydown.esc="closeSettings"
    >
      <section
        class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-white"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="cookie-settings-title" class="text-lg font-bold">
              Cookie Settings
            </h2>
            <p class="mt-1 text-sm leading-6 text-slate-600 dark:text-white/65">
              Choose which optional cookies ChlatWork can use. Necessary cookies stay on because they keep core preferences and site features working.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
            aria-label="Close cookie settings"
            @click="closeSettings"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div class="mt-5 space-y-3">
          <label
            v-for="option in cookieOptions"
            :key="option.key"
            class="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-white/10"
            :class="option.disabled ? 'opacity-80' : ''"
          >
            <span>
              <span class="block text-sm font-semibold">{{ option.label }}</span>
              <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-white/55">
                {{ option.description }}
              </span>
            </span>

            <span class="relative inline-flex h-6 w-11 shrink-0 items-center">
              <input
                v-model="draftPreferences[option.key]"
                type="checkbox"
                class="peer sr-only"
                :disabled="option.disabled"
                :aria-label="option.label"
              />
              <span
                class="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-slate-950 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-400 peer-disabled:cursor-not-allowed dark:bg-white/15 dark:peer-checked:bg-white"
              />
              <span
                class="absolute left-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5 dark:bg-slate-950 dark:peer-checked:bg-slate-950"
              />
            </span>
          </label>
        </div>

        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:border-white/15 dark:text-white/75 dark:hover:bg-white/10"
            @click="rejectOptional"
          >
            Reject Optional
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-slate-950 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
            @click="saveDraftPreferences"
          >
            Save Preferences
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { COOKIE_CONSENT_OPEN_EVENT } from "~/lib/cookie-consent";

const {
  acceptAll,
  closeSettings,
  initializeCookieConsent,
  isBannerVisible,
  isSettingsOpen,
  openSettings,
  preferences,
  rejectOptional,
  savePreferences,
} = useCookieConsent();

const draftPreferences = reactive({
  necessary: true,
  analytics: false,
  ads: false,
});
const cookieOptions = [
  {
    key: "necessary",
    label: "Necessary Cookies",
    description: "Always enabled. These keep core site preferences working.",
    disabled: true,
  },
  {
    key: "analytics",
    label: "Analytics Cookies",
    description: "Help us understand traffic and improve ChlatWork.",
    disabled: false,
  },
  {
    key: "ads",
    label: "Ads Cookies",
    description: "Support ads and related ad measurement.",
    disabled: false,
  },
] as const;

function syncDraftPreferences() {
  draftPreferences.necessary = true;
  draftPreferences.analytics = preferences.value.analytics;
  draftPreferences.ads = preferences.value.ads;
}

function saveDraftPreferences() {
  savePreferences({
    analytics: draftPreferences.analytics,
    ads: draftPreferences.ads,
  });
}

watch(isSettingsOpen, (open) => {
  if (open) {
    syncDraftPreferences();
  }
});

onMounted(() => {
  initializeCookieConsent();
  window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, openSettings);
});

onBeforeUnmount(() => {
  window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, openSettings);
});
</script>
