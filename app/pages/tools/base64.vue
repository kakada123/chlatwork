<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Base64 Encoder / Decoder</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Encode text, decode Base64, or convert a local file to Base64 in your browser.
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
              {{ mode === "encode" ? "Text to encode" : "Base64 to decode" }}
            </label>
          </div>
          <textarea
            v-model="input"
            class="h-72 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            :placeholder="
              mode === 'encode'
                ? 'Paste text here'
                : 'Paste Base64 here'
            "
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="runText"
            >
              {{ mode === "encode" ? "Encode" : "Decode" }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearAll"
            >
              Clear
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">Result</label>
            <CopyButton :text="result" label="Copy result" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-72 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            placeholder="Result appears here"
          />
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>

      <div v-else class="space-y-4">
        <div>
          <label class="block text-sm font-semibold text-gray-900">
            File to Base64
          </label>
          <input
            type="file"
            class="mt-2 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            @change="handleFile"
          />
          <p class="mt-2 text-xs text-gray-500">
            The file is read locally and is not uploaded.
          </p>
        </div>

        <div v-if="fileName" class="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700">
          {{ fileName }} - {{ fileSize }}
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              Base64 output
            </label>
            <CopyButton :text="result" label="Copy result" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-80 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            placeholder="Choose a file to generate Base64"
          />
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from "~/lib/developer-tools";

useSeoMeta({
  title: "Base64 Encoder / Decoder - ChlatWork",
  description:
    "Encode text, decode Base64, and convert files to Base64 locally in your browser.",
  ogTitle: "Base64 Encoder / Decoder - ChlatWork",
  ogDescription: "Fast, private Base64 encoding and decoding for developers.",
});

const tabs = [
  { key: "encode", label: "Encode" },
  { key: "decode", label: "Decode" },
  { key: "file", label: "File to Base64" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const mode = ref<TabKey>("encode");
const input = ref("");
const result = ref("");
const error = ref("");
const fileName = ref("");
const fileSize = ref("");

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
  fileName.value = "";
  fileSize.value = "";
}

function handleFile(event: Event) {
  error.value = "";
  result.value = "";
  const file = (event.target as HTMLInputElement).files?.[0];

  if (!file) {
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
