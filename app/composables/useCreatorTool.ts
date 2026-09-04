import {
  estimateCreatorCredits,
  type CreatorToolDefinition,
} from "~/data/creator-tools";
import {
  CreatorServiceError,
  getCreatorCredits,
  runCreatorGeneration,
  type CreatorGenerationResult,
  type CreatorRequest,
} from "~/services/creator-ai.service";

export type CreatorGenerationState =
  | "idle"
  | "ready"
  | "generating"
  | "success"
  | "error"
  | "insufficient-credits"
  | "rate-limited"
  | "unavailable"
  | "auth-required";

export type CreatorVideoStage = {
  id: string;
  label: string;
};

export const CREATOR_VIDEO_STAGES: CreatorVideoStage[] = [
  { id: "uploading", label: "Uploading" },
  { id: "queued", label: "Queued" },
  { id: "extracting", label: "Extracting audio" },
  { id: "transcribing", label: "Transcribing" },
  { id: "cleaning", label: "Cleaning Khmer" },
  { id: "creating", label: "Creating results" },
  { id: "complete", label: "Complete" },
];

export function useCreatorTool(tool: CreatorToolDefinition, initialText = "") {
  const { add: addHistory } = useCreatorHistory();
  const form = reactive({
    text: initialText,
    platform: "Facebook",
    language: "Khmer",
    tone: tool.id === "khmer-humanize" ? "Natural Khmer" : "Natural",
    videoLength: "30 sec",
    goal: "Grow audience",
    shortness: "Short",
    customVideoLength: 45,
    variation: 1,
  });
  const imageFile = ref<File | null>(null);
  const videoFile = shallowRef<File | null>(null);
  const videoDuration = ref(0);
  const state = ref<CreatorGenerationState>("idle");
  const result = shallowRef<CreatorGenerationResult | null>(null);
  const errorMessage = ref("");
  const activeVideoStage = ref(-1);
  const videoStages = CREATOR_VIDEO_STAGES;
  const requiredCredits = ref<number | null>(null);
  const availableCredits = ref<number | null>(null);
  const creditBalance = useState<number | null>("creator:credit-balance", () => null);

  const canGenerate = computed(
    () =>
      state.value !== "generating" &&
      (tool.inputType === "video"
        ? Boolean(videoFile.value)
        : form.text.trim().length > 0),
  );
  const estimatedCredits = computed(() =>
    estimateCreatorCredits(tool.creditCost, videoDuration.value),
  );

  watch(
    () => [form.text, videoFile.value] as const,
    () => {
      if (state.value === "idle" || state.value === "ready") {
        state.value = canGenerate.value ? "ready" : "idle";
      }
    },
  );

  function setVideoStage(stage: string) {
    const normalized =
      stage === "PROCESSING"
        ? "extracting"
        : stage === "GENERATING"
          ? "creating"
          : stage === "COMPLETED"
            ? "complete"
            : stage.toLowerCase();
    const index = videoStages.findIndex((item) => item.id === normalized);
    if (index >= 0) activeVideoStage.value = index;
  }

  function selectVideo(file: File, durationSeconds: number) {
    videoFile.value = file;
    videoDuration.value = durationSeconds;
    result.value = null;
    errorMessage.value = "";
    state.value = "ready";
  }

  function clearVideo() {
    videoFile.value = null;
    videoDuration.value = 0;
    activeVideoStage.value = -1;
    result.value = null;
    state.value = "idle";
  }

  async function generate(options: { variation?: boolean } = {}) {
    if (!canGenerate.value) return;

    if (options.variation) form.variation += 1;
    errorMessage.value = "";
    requiredCredits.value = null;
    availableCredits.value = null;
    state.value = "generating";
    if (tool.inputType === "video") activeVideoStage.value = 0;

    const request: CreatorRequest = {
      ...form,
      file: videoFile.value,
      imageFile: imageFile.value,
    };

    try {
      const response = await runCreatorGeneration(tool.id, request, {
        onVideoStage: setVideoStage,
      });
      result.value = response.data;
      creditBalance.value = response.usage.creditsRemaining;
      if (tool.inputType === "video") {
        activeVideoStage.value = videoStages.length - 1;
      }
      state.value = "success";
      const preview =
        response.data.sections[0]?.content ||
        response.data.items?.[0]?.content ||
        response.data.title;
      addHistory({
        toolId: tool.id,
        title: tool.title,
        route: tool.route,
        preview: preview.slice(0, 110),
      });
    } catch (error) {
      if (error instanceof CreatorServiceError) {
        requiredCredits.value = error.requiredCredits ?? estimatedCredits.value;
        availableCredits.value = error.availableCredits ?? null;
        if (error.availableCredits !== undefined) {
          creditBalance.value = error.availableCredits;
        }
        state.value =
          error.code === "INSUFFICIENT_CREDITS"
            ? "insufficient-credits"
            : error.code === "RATE_LIMITED" ||
                error.code === "DAILY_LIMIT_REACHED"
              ? "rate-limited"
              : error.code === "TEMPORARILY_UNAVAILABLE"
                ? "unavailable"
                : error.code === "AUTH_REQUIRED"
                  ? "auth-required"
                  : "error";
        if (tool.inputType === "video") setVideoStage("FAILED");
        errorMessage.value = error.message;
        return;
      }
      state.value = "error";
      errorMessage.value = "Could not generate this content. Please try again.";
    }
  }

  function replaceOriginal() {
    const replacement = result.value?.sections[0]?.content;
    if (!replacement) return;
    form.text = replacement;
    result.value = null;
    state.value = "ready";
  }

  onMounted(async () => {
    try {
      creditBalance.value = (await getCreatorCredits()).balance;
    } catch {
      // Authentication and API failures are surfaced only when the user generates.
    }
  });

  return {
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
  };
}
