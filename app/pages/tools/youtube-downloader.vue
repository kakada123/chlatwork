<script setup lang="ts">
import { Download, LoaderCircle, Play, X } from "lucide-vue-next";
import AuthLoginDialog from "~/components/auth/AuthLoginDialog.vue";
import ToolFavoriteButton from "~/components/tools/ToolFavoriteButton.vue";
import type { YoutubeQuality } from "~/lib/youtube-downloader";

const { isKhmer, locale } = useLanguage();
const { user, isReady: authReady } = useAuth();
const { state, preview, prepare, cancel, reset, download } = useYoutubeDownloader();
const input = ref("");
const quality = ref<YoutubeQuality>(720);
const loginOpen = ref(false);
const downloadStarted = ref(false);
const busy = computed(() => ["previewing", "preparing", "ticket"].includes(state.value.phase));
const copy = computed(() =>
  isKhmer.value
    ? {
        title: "ទាញយកវីដេអូ YouTube",
        description: "បញ្ចូលតំណ ជ្រើសរើសគុណភាព ហើយទាញយកជា MP4។",
        url: "តំណវីដេអូ YouTube",
        preview: "មើលវីដេអូ",
        loading: "កំពុងពិនិត្យវីដេអូ…",
        login: "ចូលគណនីដើម្បីបន្ត",
        quality: "គុណភាព MP4",
        prepare: "រៀបចំការទាញយក",
        preparing: "កំពុងរៀបចំវីដេអូ…",
        preparingNote: "វាអាចចំណាយពេលប៉ុន្មាននាទី។ អ្នកអាចបោះបង់បាន។",
        cancel: "បោះបង់",
        ready: "វីដេអូរួចរាល់",
        download: "ទាញយក MP4",
        ticket: "កំពុងបង្កើតតំណ…",
        limits: "រហូតដល់ 20 នាទី · 200 MiB · 1080p",
        privacy: "វីដេអូត្រូវបានរៀបចំនៅលើម៉ាស៊ីនមេ។ ឯកសារបណ្តោះអាសន្នផុតកំណត់ក្នុងរយៈពេល 10 នាទី។",
        permission: "ទាញយកតែវីដេអូដែលអ្នកជាម្ចាស់ ឬមានការអនុញ្ញាតឱ្យរក្សាទុក។",
        publicOnly:
          "គាំទ្រវីដេអូសាធារណៈ និង Shorts។ មិនគាំទ្រវីដេអូឯកជន ការផ្សាយផ្ទាល់ ឬបញ្ជីវីដេអូទាំងមូលទេ។",
        expires: "ផុតកំណត់",
        started: "ការទាញយកបានចាប់ផ្តើម។ ប្រសិនបើតំណផុតកំណត់ សូមរៀបចំម្តងទៀត។",
      }
    : {
        title: "YouTube Video Downloader",
        description: "Paste a link, choose a quality, and download an MP4.",
        url: "YouTube video link",
        preview: "Preview video",
        loading: "Checking video…",
        login: "Sign in to continue",
        quality: "MP4 quality",
        prepare: "Prepare download",
        preparing: "Preparing your video…",
        preparingNote: "This can take a few minutes. You can cancel at any time.",
        cancel: "Cancel",
        ready: "Your video is ready",
        download: "Download MP4",
        ticket: "Creating download link…",
        limits: "Up to 20 minutes · 200 MiB · 1080p",
        privacy:
          "Videos are prepared on our server. Temporary files expire 10 minutes after preparation.",
        permission: "Download only videos you own or have permission to save.",
        publicOnly:
          "Supports public videos and Shorts. Private videos, live streams, and whole playlists are unavailable.",
        expires: "Expires",
        started: "Download started. If the link expires, prepare the video again.",
      },
);
const errors = computed<Record<string, string>>(() =>
  isKhmer.value
    ? {
        AUTH_REQUIRED: "សូមចូលគណនីដើម្បីបន្ត។",
        UPSTREAM_AUTH_REQUIRED:
          "YouTube ទាមទារការចូលគណនីសម្រាប់សំណើនេះ។ ម៉ាស៊ីនមេរបស់យើងមិនអាចទាញយកវីដេអូនេះបាននៅពេលនេះទេ។ សូមសាកល្បងពេលក្រោយ។",
        CAPACITY: "សេវាកំពុងរវល់។ សូមសាកល្បងម្តងទៀតបន្តិចទៀត។",
        NOT_FOUND: "ឯកសារផុតកំណត់ ឬសេវាបានចាប់ផ្តើមឡើងវិញ។ សូមរៀបចំម្តងទៀត។",
        UNAVAILABLE: "សេវាទាញយកមិនទាន់អាចប្រើបាន។ សូមសាកល្បងពេលក្រោយ។",
        UNSUPPORTED_VIDEO:
          "សូមពិនិត្យតំណ។ វីដេអូត្រូវតែជាសាធារណៈ និងមាន MP4 ដែលស្ថិតក្នុងដែនកំណត់។",
        TOO_LARGE: "វីដេអូធំជាងដែនកំណត់ 200 MiB។",
        TIMEOUT: "ការរៀបចំចំណាយពេលយូរពេក។ សូមសាកល្បងវីដេអូតូចជាងនេះ។",
        CANCELLED: "ការទាញយកត្រូវបានបោះបង់។",
        DOWNLOAD_FAILED: "មិនអាចទាញយកវីដេអូបាន។ សូមសាកល្បងវីដេអូសាធារណៈផ្សេងទៀត។",
      }
    : {
        AUTH_REQUIRED: "Sign in to continue.",
        UPSTREAM_AUTH_REQUIRED:
          "YouTube requires authentication for this request. Our server cannot download this video right now. Try again later.",
        CAPACITY: "The downloader is busy. Please try again shortly.",
        NOT_FOUND: "This download expired or the service restarted. Please prepare it again.",
        UNAVAILABLE: "The downloader is temporarily unavailable. Please try again later.",
        UNSUPPORTED_VIDEO:
          "Check the link. The video must be public and offer a supported MP4 within the limits.",
        TOO_LARGE: "This video exceeds the 200 MiB limit.",
        TIMEOUT: "Preparation took too long. Try a smaller video.",
        CANCELLED: "The download was cancelled.",
        DOWNLOAD_FAILED: "Could not download this video. Please try another public video.",
      },
);
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
    ? new Date(state.value.job.expiresAt).toLocaleTimeString(isKhmer.value ? "km-KH" : "en", {
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
  title: "YouTube Video Downloader | ChlatWork",
  description: "Prepare an MP4 from a public YouTube video you own or have permission to save.",
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
            <select
              id="youtube-quality"
              v-model="quality"
              :disabled="busy"
              class="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-white/20 dark:bg-slate-900"
            >
              <option v-for="option in state.preview.qualities" :key="option" :value="option">
                {{ option }}p
              </option>
            </select>
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
