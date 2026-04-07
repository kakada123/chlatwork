<script setup lang="ts">
import type { QrEcLevel } from "~/lib/qr-generator";

defineProps<{
  generated: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: "generate"): void;
  (e: "clear"): void;
  (e: "download"): void;
}>();

const text = defineModel<string>("text", { required: true });
const size = defineModel<number>("size", { required: true });
const margin = defineModel<number>("margin", { required: true });
const ecLevel = defineModel<QrEcLevel>("ecLevel", { required: true });
const autoGenerate = defineModel<boolean>("autoGenerate", { required: true });
</script>

<template>
  <section class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
    <h2 class="text-sm font-semibold">Input</h2>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <label
          class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
        >
          Text / URL
        </label>

        <textarea
          v-model="text"
          rows="5"
          class="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="e.g. https://chlatwork.com or any text…"
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
            Download PNG
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
              Size (px)
            </label>
            <input
              v-model.number="size"
              type="number"
              min="160"
              max="1024"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Margin
            </label>
            <input
              v-model.number="margin"
              type="number"
              min="0"
              max="10"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Error correction
            </label>
            <select
              v-model="ecLevel"
              class="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </select>
          </div>

          <div class="flex items-end gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="autoGenerate" type="checkbox" />
              Auto-generate
            </label>
          </div>
        </div>

        <p class="text-xs text-gray-500">
          Tip: Use <b>H</b> for printing, <b>M</b> for normal web sharing.
        </p>
      </div>
    </div>
  </section>
</template>
