<script setup lang="ts">
import { getCreatorToolByRoute } from "~/data/creator-tools";

const route = useRoute();
const tool = getCreatorToolByRoute(route.path);

if (!tool) {
  throw createError({
    statusCode: 404,
    statusMessage: "Creator tool not found",
  });
}

const initialTopic =
  typeof route.query.topic === "string"
    ? route.query.topic.slice(0, 2_000)
    : "";
const {
  form,
  imageFile,
  videoFile,
  videoDuration,
  state,
  result,
  errorMessage,
  activeVideoStage,
  videoStages,
  requiredCredits,
  availableCredits,
  creditBalance,
  canGenerate,
  estimatedCredits,
  selectVideo,
  clearVideo,
  generate,
  replaceOriginal,
} = useCreatorTool(tool, initialTopic);

const hasResultArea = computed(
  () =>
    state.value === "generating" ||
    state.value === "insufficient-credits" ||
    Boolean(result.value),
);

useSeoMeta({
  title: `${tool.title} | ChlatWork Creator`,
  description: tool.description,
  ogTitle: `${tool.title} | ChlatWork Creator`,
  ogDescription: tool.description,
  robots: "noindex, follow",
});

function showUploadError(message: string) {
  errorMessage.value = message;
  state.value = "error";
}

function useIdea(target: "post" | "script", topic: string) {
  const route =
    target === "script" ? "/creator/create/script" : "/creator/create/post";
  void navigateTo({ path: route, query: { topic } });
}

function downloadSrt() {
  if (!result.value?.srt || !import.meta.client) return;
  const url = URL.createObjectURL(
    new Blob([result.value.srt], {
      type: "application/x-subrip;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${videoFile.value?.name.replace(/\.[^.]+$/, "") || "chlatwork-subtitles"}.srt`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <CreatorToolLayout :tool="tool" :has-result="hasResultArea">
    <template #input>
      <CreatorToolForm
        v-model:text="form.text"
        v-model:platform="form.platform"
        v-model:language="form.language"
        v-model:tone="form.tone"
        v-model:video-length="form.videoLength"
        v-model:goal="form.goal"
        v-model:shortness="form.shortness"
        v-model:custom-video-length="form.customVideoLength"
        v-model:image-file="imageFile"
        :tool="tool"
        :state="state"
        :error-message="errorMessage"
        :can-generate="canGenerate"
        :estimated-credits="estimatedCredits"
        :video-file="videoFile"
        :video-duration="videoDuration"
        :video-stages="videoStages"
        :active-video-stage="activeVideoStage"
        :credit-balance="creditBalance"
        @generate="generate()"
        @video-selected="selectVideo"
        @clear-video="clearVideo"
        @upload-error="showUploadError"
      />
    </template>

    <template #result>
      <CreatorInsufficientCredits
        v-if="state === 'insufficient-credits'"
        :required="requiredCredits ?? estimatedCredits"
        :available="availableCredits"
        @cancel="state = canGenerate ? 'ready' : 'idle'"
      />
      <CreatorResult
        v-else
        :tool="tool"
        :state="state"
        :result="result"
        @regenerate="generate()"
        @variation="generate({ variation: true })"
        @replace="replaceOriginal"
        @download-srt="downloadSrt"
        @use-idea="useIdea"
      />
    </template>
  </CreatorToolLayout>
</template>
