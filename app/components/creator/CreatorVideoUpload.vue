<script setup lang="ts">
import {
  Check,
  FileVideo,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-vue-next";
import type { CreatorVideoStage } from "~/composables/useCreatorTool";

const props = defineProps<{
  file: File | null;
  durationSeconds: number;
  busy: boolean;
  stages: CreatorVideoStage[];
  activeStage: number;
}>();

const emit = defineEmits<{
  selected: [file: File, durationSeconds: number];
  clear: [];
  error: [message: string];
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const readingMetadata = ref(false);
const acceptedTypes = new Set(["video/mp4", "video/quicktime", "video/webm"]);

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number) {
  if (!seconds) return "Duration unavailable";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

async function readVideo(file: File) {
  if (!acceptedTypes.has(file.type) && !/\.(mp4|m4v|mov|webm)$/i.test(file.name)) {
    emit("error", "Choose an MP4, M4V, MOV, or WebM video.");
    return;
  }

  readingMetadata.value = true;
  let objectUrl = "";
  try {
    objectUrl = URL.createObjectURL(file);
    const duration = await new Promise<number>((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () =>
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      video.onerror = () => resolve(0);
      video.src = objectUrl;
    });
    emit("selected", file, duration);
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    readingMetadata.value = false;
  }
}

function handleFiles(files: FileList | File[]) {
  const file = Array.from(files)[0];
  if (file) void readVideo(file);
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files) handleFiles(input.files);
  input.value = "";
}

function handleDrop(event: DragEvent) {
  dragging.value = false;
  if (event.dataTransfer?.files) handleFiles(event.dataTransfer.files);
}
</script>

<template>
  <div class="space-y-4">
    <input
      ref="fileInput"
      type="file"
      accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm"
      class="sr-only"
      :disabled="busy"
      @change="handleInput"
    />

    <div v-if="!file">
      <button
        type="button"
        class="mobile-pressable flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        :class="
          dragging
            ? 'border-sky-500 bg-sky-50 dark:border-cyan-300 dark:bg-cyan-300/10'
            : 'border-slate-300 bg-slate-50 hover:border-sky-400 hover:bg-sky-50/60 dark:border-white/15 dark:bg-white/[0.04] dark:hover:border-cyan-300/50 dark:hover:bg-white/[0.07]'
        "
        :disabled="busy || readingMetadata"
        @click="fileInput?.click()"
        @dragenter.prevent="dragging = true"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="handleDrop"
      >
        <span
          class="tool-icon-tone tool-icon-tone-cyan grid size-12 place-items-center rounded-2xl"
          aria-hidden="true"
        >
          <LoaderCircle
            v-if="readingMetadata"
            class="size-6 animate-spin motion-reduce:animate-none"
          />
          <Upload v-else class="size-6" />
        </span>
        <strong class="mt-3 text-sm text-slate-900 dark:text-white">{{
          readingMetadata ? "Reading video details…" : "Tap to upload a video"
        }}</strong>
        <span class="mt-1 text-xs leading-5 text-slate-500 dark:text-white/50"
          >Drag and drop on desktop · MP4, M4V, MOV, or WebM</span
        >
      </button>
    </div>

    <div
      v-else
      class="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
    >
      <div class="flex items-center gap-3">
        <span
          class="tool-icon-tone tool-icon-tone-cyan grid size-11 shrink-0 place-items-center rounded-xl"
          aria-hidden="true"
          ><FileVideo class="size-5"
        /></span>
        <div class="min-w-0 flex-1">
          <p
            class="truncate text-sm font-semibold text-slate-900 dark:text-white"
          >
            {{ file.name }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-white/50">
            {{ formatDuration(durationSeconds) }} · {{ formatBytes(file.size) }}
          </p>
        </div>
        <button
          type="button"
          class="mobile-pressable grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-40 dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-red-300"
          aria-label="Remove selected video"
          :disabled="busy"
          @click="emit('clear')"
        >
          <Trash2 class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>

    <ol
      v-if="activeStage >= 0"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3"
      aria-label="Video processing stages"
      aria-live="polite"
    >
      <li
        v-for="(stage, index) in stages"
        :key="stage.id"
        class="flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold"
        :class="
          index < activeStage ||
          (stage.id === 'complete' && index === activeStage)
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200'
            : index === activeStage
              ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-cyan-300/20 dark:bg-cyan-300/10 dark:text-cyan-200'
              : 'border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white/35'
        "
      >
        <Check
          v-if="
            index < activeStage ||
            (stage.id === 'complete' && index === activeStage)
          "
          class="size-4 shrink-0"
          aria-hidden="true"
        />
        <LoaderCircle
          v-else-if="index === activeStage"
          class="size-4 shrink-0 animate-spin motion-reduce:animate-none"
          aria-hidden="true"
        />
        <span
          v-else
          class="grid size-4 shrink-0 place-items-center rounded-full border border-current text-[9px]"
          aria-hidden="true"
          >{{ index + 1 }}</span
        >
        <span>{{ stage.label }}</span>
      </li>
    </ol>
  </div>
</template>
