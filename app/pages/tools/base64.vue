<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Base64 Encoder / Decoder</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ isKhmer ? "បំប្លែងអត្ថបទទៅជា Base64, ពន្លា Base64 មកវិញ ឬបំប្លែងឯកសារទៅជា Base64 ក្នុង Browser របស់អ្នក។" : "Encode text, decode Base64, or convert a local file to Base64 in your browser." }}
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
              {{ mode === "encode" ? (isKhmer ? "អត្ថបទដែលត្រូវបំប្លែង" : "Text to encode") : (isKhmer ? "កូដ Base64 ដែលត្រូវពន្លា" : "Base64 to decode") }}
            </label>
          </div>
          <textarea
            v-model="input"
            class="h-72 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            :placeholder="
              mode === 'encode'
                ? (isKhmer ? 'បិទភ្ជាប់អត្ថបទនៅទីនេះ' : 'Paste text here')
                : (isKhmer ? 'បិទភ្ជាប់ Base64 នៅទីនេះ' : 'Paste Base64 here')
            "
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="runText"
            >
              {{ mode === "encode" ? (isKhmer ? "បំប្លែង" : "Encode") : (isKhmer ? "ពន្លា" : "Decode") }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearAll"
            >
              {{ isKhmer ? "សម្អាត" : "Clear" }}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ isKhmer ? "លទ្ធផល" : "Result" }}
            </label>
            <CopyButton :text="result" :label="isKhmer ? 'ចម្លងលទ្ធផល' : 'Copy result'" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-72 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="isKhmer ? 'លទ្ធផលនឹងបង្ហាញនៅទីនេះ' : 'Result appears here'"
          />
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ isKhmer ? "ឯកសារទៅជា Base64" : "File to Base64" }}
            </label>
            <button
              v-if="fileName"
              type="button"
              class="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearFile"
            >
              {{ isKhmer ? "លុបចេញ" : "Remove" }}
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
                  {{ fileName ? (isKhmer ? "បានជ្រើសរើសឯកសារ" : "File selected") : (isKhmer ? "ជ្រើសរើស ឬទម្លាក់ឯកសារនៅទីនេះ" : "Choose or drop a file") }}
                </span>
                <span class="mt-1 block truncate text-xs text-gray-500">
                  {{
                    fileName
                      ? `${fileName} - ${fileSize}`
                      : LOCAL_PROCESSING_PRIVACY_NOTE
                  }}
                </span>
              </span>

              <span
                class="inline-flex h-10 items-center justify-center rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition group-hover:bg-gray-800"
              >
                {{ fileName ? (isKhmer ? "ប្តូរឯកសារ" : "Change file") : (isKhmer ? "ជ្រើសរើសឯកសារ" : "Choose file") }}
              </span>
            </div>
          </label>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ isKhmer ? "លទ្ធផល Base64" : "Base64 output" }}
            </label>
            <CopyButton :text="result" :label="isKhmer ? 'ចម្លងលទ្ធផល' : 'Copy result'" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-80 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="isKhmer ? 'ជ្រើសរើសឯកសារដើម្បីបង្កើត Base64' : 'Choose a file to generate Base64'"
          />
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from "~/lib/developer-tools";
import { formatFileLimit } from "~/lib/file-validation";
import { LOCAL_PROCESSING_PRIVACY_NOTE } from "~/lib/privacy-copy";

const { isKhmer } = useLanguage();

useSeoMeta({
  title: "Base64 Encoder / Decoder - ChlatWork",
  description:
    "Encode text, decode Base64, and convert files to Base64 locally in your browser.",
  ogTitle: "Base64 Encoder / Decoder - ChlatWork",
  ogDescription: "Fast, private Base64 encoding and decoding for developers.",
});

const tabs = computed(() => [
  { key: "encode", label: isKhmer.value ? "បំប្លែង (Encode)" : "Encode" },
  { key: "decode", label: isKhmer.value ? "ពន្លា (Decode)" : "Decode" },
  { key: "file", label: isKhmer.value ? "ឯកសារទៅ Base64" : "File to Base64" },
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
