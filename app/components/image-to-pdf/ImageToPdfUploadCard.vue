<template>
  <div class="space-y-4">
    <input
      ref="fileInput"
      type="file"
      class="sr-only"
      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
      multiple
      @change="handleFileChange"
    />

    <label
      class="group block cursor-pointer rounded-xl border-2 border-dashed p-5 transition"
      :class="
        isDraggingUpload
          ? 'border-gray-900 bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
      "
      @click.prevent="openPicker"
      @dragenter.prevent="isDraggingUpload = true"
      @dragover.prevent="isDraggingUpload = true"
      @dragleave.prevent="isDraggingUpload = false"
      @drop.prevent="handleDrop"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white text-gray-700 shadow-sm transition group-hover:shadow"
          aria-hidden="true"
        >
          <svg
            v-if="!isPreparingFiles"
            viewBox="0 0 24 24"
            fill="none"
            class="h-6 w-6"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M20 20H4" />
          </svg>
          <svg
            v-else
            viewBox="0 0 24 24"
            fill="none"
            class="h-6 w-6 animate-spin"
            stroke="currentColor"
            stroke-width="1.9"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.57" />
          </svg>
        </span>

        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold text-gray-900">
            {{
              isPreparingFiles
                ? "Converting HEIC..."
                : imageCount > 0
                  ? `${imageCount} image${imageCount > 1 ? "s" : ""} ready`
                  : "Choose or drop images"
            }}
          </span>
          <span class="mt-1 block text-xs text-gray-500">
            {{
              isPreparingFiles
                ? "Please wait while we prepare your files locally."
                : "JPG, PNG, WebP, and HEIC are supported. Everything stays in your browser."
            }}
          </span>
        </span>

        <span
          class="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition group-hover:bg-gray-800"
        >
          {{ isPreparingFiles ? "Processing..." : imageCount > 0 ? "Add more" : "Choose files" }}
        </span>
      </div>
    </label>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
        :disabled="!canConvert"
        @click="$emit('convert')"
      >
        {{ isGenerating ? "Generating..." : "Convert to PDF" }}
      </button>
      <button
        type="button"
        class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        @click="$emit('clear')"
      >
        Clear
      </button>
      <p class="text-sm text-gray-500">
        {{ imageCount }} image{{ imageCount === 1 ? "" : "s" }} selected
      </p>
    </div>

    <p
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {{ error }}
    </p>

    <div v-if="imageCount === 0" class="rounded-xl border bg-gray-50 p-5">
      <h2 class="text-sm font-semibold text-gray-900">Empty state</h2>
      <p class="mt-1 text-sm text-gray-500">
        Upload multiple images, then arrange them inside the PDF page preview.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  imageCount: number;
  canConvert: boolean;
  isGenerating: boolean;
  isPreparingFiles: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (event: "files-selected", files: File[]): void;
  (event: "convert"): void;
  (event: "clear"): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const isDraggingUpload = ref(false);

function openPicker() {
  fileInput.value?.click();
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);

  if (!files.length) {
    return;
  }

  emit("files-selected", files);
  input.value = "";
}

function handleDrop(event: DragEvent) {
  isDraggingUpload.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);

  if (!files.length) {
    return;
  }

  emit("files-selected", files);
}
</script>
