<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { Download, LoaderCircle, Play, X } from "lucide-vue-next";
import AuthLoginDialog from "~/components/auth/AuthLoginDialog.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import type { YoutubeQuality } from "~/lib/youtube-downloader";

const { t } = useAppI18n();

const { isKhmer, locale } = useLanguage();
const { user, isReady: authReady } = useAuth();
const { state, preview, prepare, cancel, reset, download } = useYoutubeDownloader();
const input = ref("");
const quality = ref<YoutubeQuality>(720);
const loginOpen = ref(false);
const downloadStarted = ref(false);
const busy = computed(() => ["previewing", "preparing", "ticket"].includes(state.value.phase));
const copy = computed(() => ({
  "title": t("tools.youtubeDownloader.copy.title"),
  "description": t("tools.youtubeDownloader.copy.description"),
  "url": t("tools.youtubeDownloader.copy.url"),
  "preview": t("tools.youtubeDownloader.copy.preview"),
  "loading": t("tools.youtubeDownloader.copy.loading"),
  "login": t("tools.youtubeDownloader.copy.login"),
  "quality": t("tools.youtubeDownloader.copy.quality"),
  "prepare": t("tools.youtubeDownloader.copy.prepare"),
  "preparing": t("tools.youtubeDownloader.copy.preparing"),
  "preparingNote": t("tools.youtubeDownloader.copy.preparingNote"),
  "cancel": t("tools.youtubeDownloader.copy.cancel"),
  "ready": t("tools.youtubeDownloader.copy.ready"),
  "download": t("tools.youtubeDownloader.copy.download"),
  "ticket": t("tools.youtubeDownloader.copy.ticket"),
  "limits": t("tools.youtubeDownloader.copy.limits"),
  "privacy": t("tools.youtubeDownloader.copy.privacy"),
  "permission": t("tools.youtubeDownloader.copy.permission"),
  "publicOnly": t("tools.youtubeDownloader.copy.publicOnly"),
  "expires": t("tools.youtubeDownloader.copy.expires"),
  "started": t("tools.youtubeDownloader.copy.started"),
}));
const errors = computed(() => ({
  "AUTH_REQUIRED": t("tools.youtubeDownloader.errors.AUTH_REQUIRED"),
  "UPSTREAM_AUTH_REQUIRED": t("tools.youtubeDownloader.errors.UPSTREAM_AUTH_REQUIRED"),
  "CAPACITY": t("tools.youtubeDownloader.errors.CAPACITY"),
  "NOT_FOUND": t("tools.youtubeDownloader.errors.NOT_FOUND"),
  "UNAVAILABLE": t("tools.youtubeDownloader.errors.UNAVAILABLE"),
  "UNSUPPORTED_VIDEO": t("tools.youtubeDownloader.errors.UNSUPPORTED_VIDEO"),
  "TOO_LARGE": t("tools.youtubeDownloader.errors.TOO_LARGE"),
  "TIMEOUT": t("tools.youtubeDownloader.errors.TIMEOUT"),
  "CANCELLED": t("tools.youtubeDownloader.errors.CANCELLED"),
  "DOWNLOAD_FAILED": t("tools.youtubeDownloader.errors.DOWNLOAD_FAILED"),
}));
const message = computed(() =>
  state.value.errorCode
    ? (errors.value[state.value.errorCode] ?? errors.value.DOWNLOAD_FAILED)
    : "",
);
const duration = computed(() => {
  const seconds = state.value.preview?.durationSeconds ?? 0;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
});
const expires = computed(() =>
  state.value.job?.expiresAt
    ? new Date(state.value.job.expiresAt).toLocaleTimeString((isKhmer.value ? "km-KH" : "en"), {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "",
);
watch(input, () => {
  reset();
  downloadStarted.value = false;
});
watch(
  () => state.value.preview,
  (video) => {
    if (video) quality.value = video.qualities.at(-1) ?? 720;
  },
);
watch(user, (next, previous) => {
  if (previous && next?.id !== previous.id) reset();
});

async function checkVideo() {
  if (!user.value) {
    loginOpen.value = true;
    return;
  }
  downloadStarted.value = false;
  await preview(input.value);
}

async function saveVideo() {
  const target = await download();
  if (!target || !import.meta.client) return;
  const anchor = document.createElement("a");
  anchor.href = target;
  anchor.download = state.value.job?.fileName ?? "youtube-video.mp4";
  anchor.referrerPolicy = "no-referrer";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  downloadStarted.value = true;
  // Record the download action, never the user's source URL or video identifier.
  void $fetch("/api/tool-usage", {
    method: "POST",
    body: { toolKey: "youtube-downloader", event: "COMPLETE" },
  }).catch(() => undefined);
}




useSeoMeta({
  title: () => t("tools.youtubeDownloader.metaTitle"),
  description: () => t("tools.youtubeDownloader.metaDescription"),
});
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-5 text-slate-950 dark:text-white">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold sm:text-3xl">{{ copy.title }}</h1>
        <p class="mt-2 text-sm text-slate-600 dark:text-white/60">{{ copy.description }}</p>
      </div>
      <ToolFavoriteButton tool-key="youtube-downloader" :tool-name="copy.title" />
    </header>

    <section
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.06] sm:p-6"
    >
      <form class="space-y-3" @submit.prevent="checkVideo">
        <label for="youtube-url" class="block text-sm font-semibold">{{ copy.url }}</label>
        <input
          id="youtube-url"
          v-model="input"
          type="url"
          required
          maxlength="2048"
          autocomplete="off"
          spellcheck="false"
          inputmode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          class="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-white/20"
          aria-describedby="youtube-limits"
        />
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="youtube-limits" class="text-xs text-slate-500 dark:text-white/50">
            {{ copy.limits }}
          </p>
          <button
            type="submit"
            :disabled="busy || !input.trim() || !authReady"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LoaderCircle
              v-if="state.phase === 'previewing'"
              class="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            <Play v-else class="h-4 w-4" aria-hidden="true" />
            {{ state.phase === "previewing" ? copy.loading : user ? copy.preview : copy.login }}
          </button>
        </div>
      </form>

      <div
        v-if="message"
        role="alert"
        class="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300"
      >
        {{ message }}
        <button
          v-if="state.errorCode === 'AUTH_REQUIRED'"
          type="button"
          class="ml-2 font-semibold underline"
          @click="loginOpen = true"
        >
          {{ copy.login }}
        </button>
      </div>

      <div
        v-if="state.preview"
        class="mt-5 space-y-4 border-t border-slate-200 pt-5 dark:border-white/10"
      >
        <div class="flex flex-col gap-4 sm:flex-row">
          <img
            :src="state.preview.thumbnailUrl"
            :alt="state.preview.title"
            referrerpolicy="no-referrer"
            class="aspect-video w-full rounded-xl object-cover sm:w-48"
          />
          <div class="min-w-0">
            <h2 class="break-words text-lg font-semibold">{{ state.preview.title }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-white/50">{{ duration }} · MP4</p>
          </div>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label for="youtube-quality" class="mb-2 block text-sm font-semibold">{{
              copy.quality
            }}</label>
            <ModernSelect
              id="youtube-quality"
              v-model="quality"
              :disabled="busy"
              class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:bg-slate-900"
            >
              <option v-for="option in state.preview.qualities" :key="option" :value="option">
                {{ option }}p
              </option>
            </ModernSelect>
          </div>
          <!-- Keep the primary action colored: the dark theme maps white surfaces to black. -->
          <button
            v-if="state.phase !== 'preparing'"
            type="button"
            :disabled="busy || !user"
            class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-black"
            @click="
              downloadStarted = false;
              prepare(quality);
            "
          >
            <Download class="h-4 w-4" aria-hidden="true" />
            {{ copy.prepare }}
          </button>
        </div>
        <div
          v-if="state.phase === 'preparing'"
          role="status"
          aria-live="polite"
          class="flex items-center gap-3 rounded-xl bg-sky-50 p-4 dark:bg-sky-500/10"
        >
          <LoaderCircle
            class="h-5 w-5 shrink-0 animate-spin text-sky-600 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <div class="flex-1">
            <p class="text-sm font-semibold">{{ copy.preparing }}</p>
            <p class="mt-1 text-xs text-slate-600 dark:text-white/60">{{ copy.preparingNote }}</p>
          </div>
          <button
            type="button"
            class="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold"
            @click="cancel"
          >
            <X class="h-4 w-4" aria-hidden="true" />{{ copy.cancel }}
          </button>
        </div>
        <div
          v-if="state.job?.status === 'ready' && ['ready', 'ticket'].includes(state.phase)"
          class="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10"
          aria-live="polite"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm font-semibold">{{ copy.ready }}</p>
            <p class="text-xs text-slate-600 dark:text-white/60">
              {{ ((state.job.sizeBytes ?? 0) / 1048576).toFixed(1) }} MiB · {{ copy.expires }}
              {{ expires }}
            </p>
          </div>
          <button
            type="button"
            :disabled="state.phase === 'ticket'"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            @click="saveVideo"
          >
            <Download class="h-4 w-4" aria-hidden="true" />{{
              state.phase === "ticket" ? copy.ticket : copy.download
            }}
          </button>
          <p v-if="downloadStarted" class="text-xs text-slate-600 dark:text-white/60">
            {{ copy.started }}
          </p>
        </div>
      </div>
    </section>

    <div class="space-y-2 text-xs leading-5 text-slate-500 dark:text-white/50">
      <p>{{ copy.publicOnly }}</p>
      <p>{{ copy.privacy }}</p>
      <p>{{ copy.permission }}</p>
    </div>
    <AuthLoginDialog
      :open="loginOpen"
      :locale="locale"
      @close="loginOpen = false"
      @success="checkVideo"
    />
  </div>
</template>
