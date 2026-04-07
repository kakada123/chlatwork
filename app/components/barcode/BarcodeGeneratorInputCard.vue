<script setup lang="ts">
import type { BarcodeFormat } from "~/lib/barcode-generator";

defineProps<{
  generated: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: "generate"): void;
  (e: "clear"): void;
  (e: "download"): void;
}>();

const value = defineModel<string>("value", { required: true });
const format = defineModel<BarcodeFormat>("format", { required: true });
const height = defineModel<number>("height", { required: true });
const width = defineModel<number>("width", { required: true });
const displayValue = defineModel<boolean>("displayValue", { required: true });
</script>

<template>
  <section class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
    <h2 class="text-sm font-semibold">Input</h2>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <label
          class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Value
        </label>

        <input
          v-model="value"
          type="text"
          class="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="e.g. 8851234567890"
        />

        <div class="flex gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            type="button"
            @click="emit('generate')"
          >
            Generate
          </button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            type="button"
            @click="emit('clear')"
          >
            Clear
          </button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="!generated"
            @click="emit('download')"
          >
            Download SVG
          </button>
        </div>

        <p v-if="error" class="text-sm text-red-600">
          {{ error }}
        </p>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold">Options</h3>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Format
            </label>

            <select
              v-model="format"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN13</option>
              <option value="UPC">UPC</option>
              <option value="CODE39">CODE39</option>
            </select>
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Height
            </label>

            <input
              v-model.number="height"
              type="number"
              min="20"
              max="200"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Bar width
            </label>

            <input
              v-model.number="width"
              type="number"
              min="1"
              max="5"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div class="flex items-end gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="displayValue" type="checkbox" />
              Show text
            </label>
          </div>
        </div>

        <p class="text-xs text-gray-500">
          Tip: Use <b>EAN13</b> for retail codes (12 digits recommended;
          checksum auto). Use <b>CODE128</b> for any text/number.
        </p>
      </div>
    </div>
  </section>
</template>
