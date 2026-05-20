<script setup lang="ts">
import { formatFileSize } from "~/lib/pdf-tools";

defineProps<{
  files: File[];
  allowReorder?: boolean;
}>();

defineEmits<{
  (event: "remove", index: number): void;
  (event: "move", index: number, direction: -1 | 1): void;
}>();
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-bold text-slate-950 dark:text-white">Selected files</h2>
      <span class="text-xs text-slate-500 dark:text-white/50">
        {{ files.length }} file{{ files.length === 1 ? "" : "s" }}
      </span>
    </div>

    <div
      v-if="files.length === 0"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/55"
    >
      No files selected yet.
    </div>

    <ul v-else class="space-y-2">
      <li
        v-for="(file, index) in files"
        :key="`${file.name}-${file.lastModified}-${index}`"
        class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.06]"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-600 dark:bg-white/10 dark:text-white"
        >
          {{ index + 1 }}
        </span>

        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {{ file.name }}
          </span>
          <span class="text-xs text-slate-500 dark:text-white/50">
            {{ formatFileSize(file.size) }}
          </span>
        </span>

        <span v-if="allowReorder" class="flex shrink-0 gap-1">
          <button
            type="button"
            class="h-9 rounded-lg border px-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
            :disabled="index === 0"
            @click="$emit('move', index, -1)"
          >
            Up
          </button>
          <button
            type="button"
            class="h-9 rounded-lg border px-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-white/10 dark:hover:bg-white/10"
            :disabled="index === files.length - 1"
            @click="$emit('move', index, 1)"
          >
            Down
          </button>
        </span>

        <button
          type="button"
          class="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-300/20 dark:bg-red-300/10 dark:text-red-100"
          @click="$emit('remove', index)"
        >
          Remove
        </button>
      </li>
    </ul>
  </div>
</template>
