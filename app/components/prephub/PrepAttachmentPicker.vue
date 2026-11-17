<script setup lang="ts">
import { Files, Image, X } from "lucide-vue-next";
import { PREP_FILE_ACCEPT, validatePrepFiles } from "~/lib/prephub-attachments";
const props = defineProps<{
  modelValue: File[];
  busy?: boolean;
  existingCount?: number;
}>();
const emit = defineEmits<{ "update:modelValue": [files: File[]] }>();
const { t } = useAppI18n();
const error = ref("");
function choose(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = Array.from(input.files ?? []);
  input.value = "";
  if (props.busy || !selected.length) return;
  const files = [...props.modelValue];
  for (const file of selected)
    if (
      !files.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.lastModified === file.lastModified,
      )
    )
      files.push(file);
  const invalid = validatePrepFiles(files, props.existingCount);
  error.value = invalid
    ? t(
        invalid === "count"
          ? "prephub.attachments.tooMany"
          : "prephub.fileHint",
      )
    : "";
  if (!invalid) emit("update:modelValue", files);
}
</script>
<template>
  <div class="space-y-3">
    <label class="prep-label">
      {{ t("prephub.attachments.chooseFiles") }}
      <input
        type="file"
        multiple
        :accept="PREP_FILE_ACCEPT"
        class="prep-input"
        :disabled="busy"
        @change="choose"
      />
    </label>
    <p class="text-xs leading-relaxed text-slate-500">
      {{ t("prephub.fileHint") }}
    </p>
    <p v-if="error" role="alert" class="text-sm text-red-600 dark:text-red-300">
      {{ error }}
    </p>
    <ul
      v-if="modelValue.length"
      class="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 px-3 dark:divide-white/10 dark:border-white/15"
    >
      <li
        v-for="(file, index) in modelValue"
        :key="`${file.name}-${file.size}-${file.lastModified}`"
        class="flex items-center gap-3 py-1"
      >
        <component
          :is="file.type.startsWith('image/') ? Image : Files"
          class="size-5 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1"
          ><span class="block truncate text-sm" :title="file.name">{{
            file.name
          }}</span
          ><span class="text-xs tabular-nums text-slate-500"
            >{{ (file.size / 1024).toFixed(1) }} KiB</span
          ></span
        >
        <button
          type="button"
          class="prep-icon"
          :disabled="busy"
          :aria-label="`${t('prephub.delete')}: ${file.name}`"
          @click="
            emit(
              'update:modelValue',
              modelValue.filter((_, i) => i !== index),
            )
          "
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </div>
</template>
