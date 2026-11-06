<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">{{ t("tools.base64.base64EncoderDecoder") }}</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.base64.encodeTextDecodeBase64OrConvertALocalFile") }}
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-semibold"
        :class="
          mode === tab.key
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
        "
        @click="switchMode(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div v-if="mode !== 'file'" class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex h-10 items-center">
            <label class="block text-sm font-semibold text-gray-900">
              {{ mode === "encode" ? (t("tools.base64.textToEncode")) : (t("tools.base64.base64ToDecode")) }}
            </label>
          </div>
          <textarea
            v-model="input"
            class="h-72 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            :placeholder="
              mode === 'encode'
                ? (t(&quot;tools.base64.pasteTextHere&quot;))
                : (t(&quot;tools.base64.pasteBase64Here&quot;))
            "
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="runText"
            >
              {{ mode === "encode" ? (t("tools.base64.encode_2")) : (t("tools.base64.decode_2")) }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearAll"
            >
              {{ t("tools.base64.clear") }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.base64.result") }}
            </label>
            <CopyButton :text="result" :label="t(&quot;tools.base64.copyResult&quot;)" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-72 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="t(&quot;tools.base64.resultAppearsHere&quot;)"
          />
          <p v-if="error" class="text-sm text-red-600">{{ localizeToolError(error, isKhmer) }}</p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.base64.fileToBase64_2") }}
            </label>
            <button
              v-if="fileName"
              type="button"
              class="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearFile"
            >
              {{ t("tools.base64.remove") }}
            </button>
          </div>

          <input
            id="base64-file-upload"
            ref="fileInput"
            type="file"
            class="sr-only"
            @change="handleFile"
          />

          <label
            for="base64-file-upload"
            class="group block cursor-pointer rounded-xl border-2 border-dashed p-5 transition"
            :class="
              isDragging
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'
            "
            @dragenter.prevent="isDragging = true"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
          >
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
              <span
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white text-gray-700 shadow-sm transition group-hover:shadow"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  class="h-6 w-6"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 16V4" />
                  <path d="m7 9 5-5 5 5" />
                  <path d="M20 20H4" />
                </svg>
              </span>

              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold text-gray-900">
                  {{ fileName ? (t("tools.base64.fileSelected")) : (t("tools.base64.chooseOrDropAFile")) }}
                </span>
                <span class="mt-1 block truncate text-xs text-gray-500">
                  {{
                    fileName
                      ? `${fileName} - ${fileSize}`
                      : (t("tools.common.privacyDescription"))
                  }}
                </span>
              </span>

              <span
                class="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition group-hover:bg-gray-800"
              >
                {{ fileName ? (t("tools.base64.changeFile")) : (t("tools.base64.chooseFile")) }}
              </span>
            </div>
          </label>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.base64.base64Output") }}
            </label>
            <CopyButton :text="result" :label="t(&quot;tools.base64.copyResult&quot;)" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-80 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="t(&quot;tools.base64.chooseAFileToGenerateBase64&quot;)"
          />
          <p v-if="error" class="text-sm text-red-600">{{ localizeToolError(error, isKhmer) }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from "~/lib/developer-tools";
import { formatFileLimit } from "~/lib/file-validation";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.base64.metaTitle"),
  description: () => t("tools.base64.metaDescription"),
  ogTitle: () => t("tools.base64.metaOgTitle"),
  ogDescription: () => t("tools.base64.metaOgDescription"),
});

const tabs = computed(() => [
  { key: "encode", label: t("tools.base64.encode") },
  { key: "decode", label: t("tools.base64.decode") },
  { key: "file", label: t("tools.base64.fileToBase64") },
] as const);

type TabKey = "encode" | "decode" | "file";

const mode = ref<TabKey>("encode");
const input = ref("");
const result = ref("");
const error = ref("");
const fileName = ref("");
const fileSize = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const MAX_BASE64_FILE_SIZE = 20 * 1024 * 1024;

function switchMode(nextMode: TabKey) {
  mode.value = nextMode;
  error.value = "";
  result.value = "";
}

function runText() {
  error.value = "";
  result.value = "";

  try {
    result.value =
      mode.value === "encode"
        ? encodeUtf8ToBase64(input.value)
        : decodeBase64ToUtf8(input.value);
  } catch (caught: any) {
    error.value = caught?.message ?? "Unable to process the input.";
  }
}

function clearAll() {
  input.value = "";
  result.value = "";
  error.value = "";
  clearFile();
}

function clearFile() {
  result.value = "";
  error.value = "";
  fileName.value = "";
  fileSize.value = "";

  if (fileInput.value) {
    fileInput.value.value = "";
  }
}

function handleFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];

  if (!file) {
    return;
  }

  readFileAsBase64(file);
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];

  if (!file) {
    return;
  }

  readFileAsBase64(file);
}

function readFileAsBase64(file: File) {
  error.value = "";
  result.value = "";

  if (file.size > MAX_BASE64_FILE_SIZE) {
    fileName.value = "";
    fileSize.value = "";
    error.value = `Choose a file ${formatFileLimit(MAX_BASE64_FILE_SIZE)} or smaller to keep browser memory safe.`;
    if (fileInput.value) {
      fileInput.value.value = "";
    }
    return;
  }

  fileName.value = file.name;
  fileSize.value = `${(file.size / 1024).toFixed(1)} KB`;

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result ?? "");
    result.value = dataUrl.split(",")[1] ?? "";
  };
  reader.onerror = () => {
    error.value = "Unable to read this file.";
  };
  reader.readAsDataURL(file);
}
</script>
