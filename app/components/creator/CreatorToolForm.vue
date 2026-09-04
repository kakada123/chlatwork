<script setup lang="ts">
import { ImagePlus, LoaderCircle, Sparkles, X } from "lucide-vue-next";
import type {
  CreatorGenerationState,
  CreatorVideoStage,
} from "~/composables/useCreatorTool";
import type { CreatorToolDefinition } from "~/data/creator-tools";

const props = defineProps<{
  tool: CreatorToolDefinition;
  state: CreatorGenerationState;
  errorMessage: string;
  canGenerate: boolean;
  estimatedCredits: number;
  videoFile: File | null;
  videoDuration: number;
  videoStages: CreatorVideoStage[];
  activeVideoStage: number;
  creditBalance: number | null;
}>();

const emit = defineEmits<{
  generate: [];
  videoSelected: [file: File, durationSeconds: number];
  clearVideo: [];
  uploadError: [message: string];
}>();

const text = defineModel<string>("text", { required: true });
const platform = defineModel<string>("platform", { required: true });
const language = defineModel<string>("language", { required: true });
const tone = defineModel<string>("tone", { required: true });
const videoLength = defineModel<string>("videoLength", { required: true });
const goal = defineModel<string>("goal", { required: true });
const shortness = defineModel<string>("shortness", { required: true });
const customVideoLength = defineModel<number>("customVideoLength", {
  required: true,
});
const imageFile = defineModel<File | null>("imageFile", { required: true });

const imageInput = ref<HTMLInputElement | null>(null);
const busy = computed(() => props.state === "generating");
const platformOptions = ["Facebook", "TikTok", "Instagram", "YouTube"];
const languageOptions = ["Khmer", "English", "Khmer + English"];
const generalToneOptions = [
  "Natural",
  "Professional",
  "Friendly",
  "Funny",
  "Selling",
  "Gen Z",
];
const rewriteToneOptions = [
  "Natural",
  "Professional",
  "Friendly",
  "Shorter",
  "More engaging",
  "Selling",
];
const humanizeToneOptions = [
  "Natural Khmer",
  "Casual",
  "Gen Z",
  "Professional",
  "Friendly",
  "Seller",
];
const videoLengthOptions = ["15 sec", "30 sec", "60 sec", "2 min", "Custom"];
const goalOptions = [
  "Grow audience",
  "Sell product",
  "Educate",
  "Engagement",
  "Brand awareness",
];
const shortnessOptions = [
  "Short",
  "Very short",
  "TikTok style",
  "Facebook short post",
];
const toneOptions = computed(() => {
  if (props.tool.id === "khmer-humanize") return humanizeToneOptions;
  if (props.tool.id === "khmer-rewrite") return rewriteToneOptions;
  return generalToneOptions;
});
const durationLabel = computed(() => {
  if (!props.videoDuration) return undefined;
  const total = Math.round(props.videoDuration);
  return `${Math.floor(total / 60)}m ${total % 60}s`;
});

function chooseImage(event: Event) {
  const input = event.target as HTMLInputElement;
  imageFile.value = input.files?.[0] ?? null;
  input.value = "";
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="emit('generate')">
    <div>
      <div class="flex items-center justify-between gap-3">
        <label
          :for="`creator-input-${tool.id}`"
          class="text-sm font-semibold text-slate-900 dark:text-white"
          >{{ tool.inputLabel }}</label
        >
        <span
          v-if="tool.inputType === 'text'"
          class="text-xs text-slate-400 dark:text-white/35"
          >{{ text.length.toLocaleString() }} characters</span
        >
      </div>

      <textarea
        v-if="tool.inputType === 'text'"
        :id="`creator-input-${tool.id}`"
        v-model="text"
        rows="7"
        class="mt-2 min-h-40 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3.5 text-base leading-7 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-white/30 dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
        :placeholder="tool.inputPlaceholder"
        :disabled="busy"
      />

      <CreatorVideoUpload
        v-else
        class="mt-2"
        :file="videoFile"
        :duration-seconds="videoDuration"
        :busy="busy"
        :stages="videoStages"
        :active-stage="activeVideoStage"
        @selected="
          (file, durationSeconds) =>
            emit('videoSelected', file, durationSeconds)
        "
        @clear="emit('clearVideo')"
        @error="emit('uploadError', $event)"
      />
    </div>

    <div
      v-if="tool.imageAttachment"
      class="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <input
        ref="imageInput"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        class="sr-only"
        :disabled="busy"
        @change="chooseImage"
      />
      <div class="flex items-center gap-3">
        <span
          class="tool-icon-tone tool-icon-tone-blue grid size-10 shrink-0 place-items-center rounded-xl"
          aria-hidden="true"
          ><ImagePlus class="size-5"
        /></span>
        <div class="min-w-0 flex-1">
          <p
            class="truncate text-sm font-semibold text-slate-900 dark:text-white"
          >
            {{ imageFile?.name || "Add an optional reference image" }}
          </p>
          <p class="mt-0.5 text-xs text-slate-500 dark:text-white/50">
            JPG, PNG, or WebP
          </p>
        </div>
        <button
          v-if="imageFile"
          type="button"
          class="grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-white hover:text-red-600 dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-red-300"
          aria-label="Remove reference image"
          :disabled="busy"
          @click="imageFile = null"
        >
          <X class="size-4" />
        </button>
        <button
          v-else
          type="button"
          class="min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-sky-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70 dark:hover:bg-white/[0.10]"
          :disabled="busy"
          @click="imageInput?.click()"
        >
          Choose
        </button>
      </div>
    </div>

    <CreatorOptionSelector
      v-if="tool.config.includes('platform')"
      id="creator-platform"
      v-model="platform"
      label="Platform"
      :options="platformOptions"
    />
    <CreatorOptionSelector
      v-if="tool.config.includes('language')"
      id="creator-language"
      v-model="language"
      label="Language"
      :options="languageOptions"
    />
    <CreatorOptionSelector
      v-if="tool.config.includes('tone')"
      id="creator-tone"
      v-model="tone"
      label="Tone"
      :options="toneOptions"
    />
    <CreatorOptionSelector
      v-if="tool.config.includes('video-length')"
      id="creator-video-length"
      v-model="videoLength"
      label="Video length"
      :options="videoLengthOptions"
    />
    <div
      v-if="tool.config.includes('video-length') && videoLength === 'Custom'"
      class="max-w-48"
    >
      <label
        for="creator-custom-length"
        class="text-sm font-semibold text-slate-900 dark:text-white"
        >Custom seconds</label
      >
      <input
        id="creator-custom-length"
        v-model.number="customVideoLength"
        type="number"
        min="5"
        max="600"
        class="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-white/10 dark:bg-white/[0.05] dark:focus:border-cyan-300/50 dark:focus:ring-cyan-300/15"
      />
    </div>
    <CreatorOptionSelector
      v-if="tool.config.includes('goal')"
      id="creator-goal"
      v-model="goal"
      label="Goal"
      :options="goalOptions"
    />
    <CreatorOptionSelector
      v-if="tool.config.includes('shortness')"
      id="creator-shortness"
      v-model="shortness"
      label="Output style"
      :options="shortnessOptions"
    />

    <div
      v-if="errorMessage && state !== 'insufficient-credits'"
      class="rounded-xl border px-3 py-2.5 text-sm leading-6"
      :class="
        state === 'rate-limited'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100'
          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200'
      "
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div class="border-t border-slate-200 pt-4 dark:border-white/10">
      <CreatorCreditCost
        :credits="estimatedCredits"
        :dynamic="tool.creditCost.type === 'video'"
        :duration-label="durationLabel"
        :balance="creditBalance"
      />
      <button
        type="submit"
        class="mobile-pressable mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#082552] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d356f] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-cyan-300 dark:text-slate-950 dark:hover:bg-cyan-200 dark:focus-visible:ring-offset-black sm:w-auto"
        :disabled="!canGenerate"
      >
        <LoaderCircle
          v-if="busy"
          class="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <Sparkles v-else class="size-4" aria-hidden="true" />
        {{ busy ? "Creating…" : tool.submitLabel }}
        <span v-if="!busy" class="font-normal opacity-75"
          >· {{ estimatedCredits }} credits</span
        >
      </button>
      <p class="mt-2 text-xs leading-5 text-slate-400 dark:text-white/35">
        Your balance and final cost are always confirmed by the server before
        processing.
      </p>
    </div>
  </form>
</template>
