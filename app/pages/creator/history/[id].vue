<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useProductCopy } from "~/composables/useProductCopy";
import { CREATOR_TOOLS, CREATOR_FEATURE_TO_TOOL } from "~/data/creator-tools";
import {
  getCreatorHistoryEntry,
  type CreatorHistoryApiItem,
} from "~/services/creator-ai.service";
import { containsThaiScript } from "~/lib/creator-output-language";

const { t } = useAppI18n();

const { productText } = useProductCopy();

definePageMeta({ layout: "creator", middleware: "auth" });

const route = useRoute();
const { user } = useAuth();
const { creatorEnabled } = useFeatureAvailability();
const entry = shallowRef<CreatorHistoryApiItem | null>(null);
const loading = ref(true);
const errorMessage = ref("");
let requestVersion = 0;

const tool = computed(() =>
  CREATOR_TOOLS.find(
    (candidate) =>
      candidate.id === CREATOR_FEATURE_TO_TOOL[entry.value?.feature ?? ""],
  ),
);
const result = computed(() =>
  entry.value &&
  tool.value &&
  creatorEnabled(tool.value.id) &&
  !containsThaiScript(entry.value)
    ? entry.value.result
    : null,
);
const createdAt = computed(() =>
  entry.value
    ? new Date(entry.value.createdAt).toLocaleString("en-GB", {
        timeZone: "Asia/Phnom_Penh",
      })
    : "",
);

useSeoMeta({
  title: "Generation details | ChlatWork Creator",
  robots: "noindex, nofollow, noarchive",
});

async function load() {
  if (!import.meta.client) return;
  const version = ++requestVersion;
  const userId = user.value?.id;
  const id = route.params.id;
  entry.value = null;
  errorMessage.value = "";
  loading.value = true;
  if (!userId) {
    loading.value = false;
    errorMessage.value = "Sign in to view your saved generation.";
    return;
  }
  try {
    // Fetch through the account-scoped API; URLs alone never authorize saved output.
    const saved =
      typeof id === "string" ? await getCreatorHistoryEntry(id) : null;
    if (version !== requestVersion || user.value?.id !== userId) return;
    if (!saved?.result || containsThaiScript(saved)) {
      errorMessage.value = "This saved generation is no longer available.";
      return;
    }
    entry.value = saved;
    if (!result.value) {
      errorMessage.value = "This Creator tool is temporarily unavailable.";
    }
  } catch {
    if (version !== requestVersion || user.value?.id !== userId) return;
    errorMessage.value = "Could not load this generation. Please try again.";
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

watch([() => route.params.id, () => user.value?.id], () => void load());
onMounted(() => void load());
onBeforeUnmount(() => {
  requestVersion++;
});

function downloadSrt() {
  if (
    !import.meta.client ||
    !result.value?.srt ||
    containsThaiScript(result.value)
  )
    return;
  const url = URL.createObjectURL(
    new Blob([result.value.srt], {
      type: "application/x-subrip;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "chlatwork-subtitles.srt";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <main
    class="creator-khmer-content mx-auto w-full max-w-[1180px] space-y-5 text-slate-950 dark:text-white"
  >
    <NuxtLink
      to="/creator#creator-recent-title"
      class="inline-flex min-h-11 items-center text-sm font-semibold text-sky-700 underline-offset-4 hover:underline dark:text-cyan-300"
    >
      {{ t("products.creator.back_to_recent_generations") }}
    </NuxtLink>
    <header>
      <h1>{{ t("products.creator.generation_details") }}</h1>
      <p
        v-if="entry && tool"
        class="mt-2 text-sm leading-6 text-slate-500 dark:text-white/60"
      >
        {{ productText(tool.title) }} · {{ createdAt }} {{ t("products.creator.phnom_penh") }}
      </p>
    </header>
    <section
      v-if="loading"
      role="status"
      aria-busy="true"
      class="rounded-2xl border border-slate-200 p-5 text-sm dark:border-white/10"
    >
      {{ t("products.creator.loading_your_saved_generation") }}
    </section>
    <section
      v-else-if="errorMessage || !result"
      role="alert"
      class="rounded-2xl border border-slate-200 p-5 text-sm dark:border-white/10"
    >
      <p>
        {{ productText(errorMessage || "This Creator tool is temporarily unavailable.") }}
      </p>
      <button
        type="button"
        class="mt-3 min-h-11 rounded-xl bg-violet-600 px-4 font-semibold text-white"
        @click="load"
      >
        {{ t("products.moments.try_again") }}
      </button>
    </section>
    <CreatorResult
      v-else-if="tool"
      :tool="tool"
      state="success"
      :result="result"
      history-view
      @download-srt="downloadSrt"
    />
  </main>
</template>
