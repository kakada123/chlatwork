<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">URL Encoder / Decoder</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Encode and decode URL components, query strings, and pasted URL parameters.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex h-10 items-center">
            <label class="block text-sm font-semibold text-gray-900">Input</label>
          </div>
          <textarea
            v-model="input"
            class="h-72 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="name=Kakada%20Ngen&debug=true"
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="run('encode')"
            >
              Encode
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="run('decode')"
            >
              Decode
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

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">Result</label>
            <CopyButton :text="result" label="Copy result" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-72 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            placeholder="Encoded or decoded result appears here"
          />
        </div>
      </div>
    </section>

    <section v-if="queryRows.length" class="rounded-xl border bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-sm font-semibold text-gray-900">Decoded query parameters</h2>
      <div class="overflow-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="p-2 font-semibold">Key</th>
              <th class="p-2 font-semibold">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in queryRows" :key="`${row.key}-${row.value}`" class="border-t">
              <td class="max-w-[220px] break-words p-2 font-mono">{{ row.key }}</td>
              <td class="break-words p-2 font-mono">{{ row.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "~/components/developer-tools/CopyButton.vue";

useSeoMeta({
  title: "URL Encoder / Decoder - ChlatWork",
  description: "Encode and decode URL components and query strings locally.",
  ogTitle: "URL Encoder / Decoder - ChlatWork",
  ogDescription: "Developer-friendly URL encoding and decoding.",
});

const input = ref("");
const result = ref("");
const error = ref("");

const queryRows = computed(() => parseQueryRows(result.value || input.value));

function run(mode: "encode" | "decode") {
  error.value = "";

  try {
    result.value =
      mode === "encode" ? encodeURIComponent(input.value) : decodeURIComponent(input.value);
  } catch (caught: any) {
    error.value = caught?.message ?? "Unable to process this URL text.";
    result.value = "";
  }
}

function clearAll() {
  input.value = "";
  result.value = "";
  error.value = "";
}

function parseQueryRows(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !trimmed.includes("=")) {
    return [] as Array<{ key: string; value: string }>;
  }

  const query = trimmed.includes("?") ? trimmed.split("?").slice(1).join("?") : trimmed;
  const clean = query.startsWith("#") ? query.slice(1) : query;
  const params = new URLSearchParams(clean);

  return Array.from(params.entries()).map(([key, paramValue]) => ({
    key,
    value: paramValue,
  }));
}
</script>
