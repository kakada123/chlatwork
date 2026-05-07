<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Hash Generator</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Generate MD5, SHA-1, SHA-256, and SHA-512 hashes for text locally.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">Text input</label>
        <textarea
          v-model="input"
          class="h-56 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="Text to hash"
        />
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isHashing"
            @click="generate"
          >
            {{ isHashing ? "Generating" : "Generate hashes" }}
          </button>
          <button
            type="button"
            class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="clearAll"
          >
            Clear
          </button>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>
    </section>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-sm font-semibold text-gray-900">Hashes</h2>
      <div class="space-y-3">
        <div
          v-for="algorithm in algorithms"
          :key="algorithm"
          class="rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-gray-700">{{ algorithm }}</p>
            <CopyButton :text="results[algorithm]" label="Copy" />
          </div>
          <p class="break-all font-mono text-sm text-gray-700">
            {{ results[algorithm] || "Run the generator to see output." }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { hashText, type HashAlgorithm } from "~/lib/developer-tools";

useSeoMeta({
  title: "Hash Generator - ChlatWork",
  description: "Generate MD5, SHA-1, SHA-256, and SHA-512 hashes from text.",
  ogTitle: "Hash Generator - ChlatWork",
  ogDescription: "Browser-based hash generator for developer workflows.",
});

const algorithms: HashAlgorithm[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];
const input = ref("");
const isHashing = ref(false);
const error = ref("");
const results = reactive<Record<HashAlgorithm, string>>({
  MD5: "",
  "SHA-1": "",
  "SHA-256": "",
  "SHA-512": "",
});

async function generate() {
  error.value = "";
  isHashing.value = true;

  try {
    for (const algorithm of algorithms) {
      results[algorithm] = await hashText(input.value, algorithm);
    }
  } catch (caught: any) {
    error.value = caught?.message ?? "Unable to generate hashes.";
  } finally {
    isHashing.value = false;
  }
}

function clearAll() {
  input.value = "";
  error.value = "";
  for (const algorithm of algorithms) {
    results[algorithm] = "";
  }
}
</script>
