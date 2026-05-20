<script setup lang="ts">
const props = defineProps<{
  accept: string;
  multiple: boolean;
  disabled?: boolean;
  title: string;
  description: string;
}>();

const emit = defineEmits<{
  (event: "files-selected", files: File[]): void;
}>();

const inputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);

function openPicker() {
  if (!props.disabled) {
    inputRef.value?.click();
  }
}

function emitFiles(files: File[]) {
  if (!files.length || props.disabled) {
    return;
  }

  emit("files-selected", files);
}

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  emitFiles(Array.from(input.files ?? []));
  input.value = "";
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  emitFiles(Array.from(event.dataTransfer?.files ?? []));
}
</script>

<template>
  <div>
    <input
      ref="inputRef"
      type="file"
      class="sr-only"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="handleInput"
    />

    <button
      type="button"
      class="group flex w-full flex-col gap-4 rounded-2xl border-2 border-dashed p-5 text-left transition sm:flex-row sm:items-center"
      :class="
        isDragging
          ? 'border-sky-400 bg-sky-50 dark:border-cyan-300 dark:bg-cyan-300/10'
          : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/60 dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-cyan-300/50 dark:hover:bg-white/[0.10]'
      "
      :disabled="disabled"
      @click="openPicker"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="handleDrop"
    >
      <span
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M20 20H4" />
        </svg>
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-sm font-bold text-slate-950 dark:text-white">
          {{ title }}
        </span>
        <span class="mt-1 block text-xs leading-5 text-slate-500 dark:text-white/55">
          {{ description }}
        </span>
      </span>

      <span
        class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition group-hover:bg-slate-800 dark:bg-white dark:text-slate-950"
      >
        Choose files
      </span>
    </button>
  </div>
</template>
