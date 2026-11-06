<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ isKhmer ? "រៀបចំ និងផ្ទៀងផ្ទាត់ JSON" : "JSON Formatter / Validator" }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ isKhmer ? "រៀបចំ Pretty print, បង្រួម Minify និងផ្ទៀងផ្ទាត់កំហុស JSON ដោយបង្ហាញជួរដេក និងជួរឈរច្បាស់លាស់។" : "Pretty print, minify, and validate JSON with line and column error details." }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex h-10 items-center">
            <label class="block text-sm font-semibold text-gray-900">
              {{ isKhmer ? "ទិន្នន័យ JSON ដើម" : "JSON input" }}
            </label>
          </div>
          <textarea
            v-model="input"
            class="h-96 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder='{"name":"ChlatWork","tools":["json","jwt"]}'
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="run('pretty')"
            >
              {{ isKhmer ? "រៀបចំឱ្យស្អាត (Pretty)" : "Pretty print" }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="run('minify')"
            >
              {{ isKhmer ? "បង្រួម (Minify)" : "Minify" }}
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
            <CopyButton :text="result.output" :label="isKhmer ? 'ចម្លងលទ្ធផល' : 'Copy result'" />
          </div>
          <textarea
            v-model="result.output"
            readonly
            class="h-96 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="isKhmer ? 'ទិន្នន័យ JSON ដែលបានរៀបចំរួចនឹងបង្ហាញនៅទីនេះ' : 'Formatted JSON appears here'"
          />
        </div>
      </div>

      <div
        v-if="result.error"
        class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
      >
        <p class="font-semibold">{{ isKhmer ? "ទម្រង់ JSON មិនត្រឹមត្រូវ" : "Invalid JSON" }}</p>
        <p class="mt-1">{{ result.error }}</p>
        <p v-if="result.errorLine" class="mt-1">
          {{ isKhmer ? `ជួរដេក ${result.errorLine}, ជួរឈរ ${result.errorColumn}` : `Line ${result.errorLine}, column ${result.errorColumn}` }}
        </p>
        <pre
          v-if="result.errorPreview"
          class="mt-2 overflow-auto rounded-lg bg-white p-2 font-mono text-xs text-red-700"
          >{{ result.errorPreview }}</pre
        >
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { formatJson, type JsonFormatResult } from "~/lib/developer-tools";

const { isKhmer } = useLanguage();

useSeoMeta({
  title: "JSON Formatter / Validator - ChlatWork",
  description: "Format, minify, and validate JSON with useful error location details.",
  ogTitle: "JSON Formatter / Validator - ChlatWork",
  ogDescription: "Pretty print and validate JSON locally in your browser.",
});

const input = ref("");
const result = reactive<JsonFormatResult>({
  output: "",
  error: "",
  errorLine: null,
  errorColumn: null,
  errorPreview: "",
});

function run(mode: "pretty" | "minify") {
  const next = formatJson(input.value, mode);
  Object.assign(result, next);
}

function clearAll() {
  input.value = "";
  Object.assign(result, {
    output: "",
    error: "",
    errorLine: null,
    errorColumn: null,
    errorPreview: "",
  });
}
</script>
