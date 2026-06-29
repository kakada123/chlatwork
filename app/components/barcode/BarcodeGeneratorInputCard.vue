<script setup lang="ts">
import {
  hasNonAsciiBarcodeCharacters,
  type BarcodeFormat,
} from "~/lib/barcode-generator";

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
const currentItem = ref("");

const items = computed<string[]>({
  get() {
    return value.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  },
  set(nextItems) {
    value.value = nextItems.join("\n");
  },
});

function addItem() {
  const next = currentItem.value.trim();
  if (!next) {
    return;
  }

  items.value = [...items.value, next];
  currentItem.value = "";
}

function removeItem(index: number) {
  items.value = items.value.filter((_, currentIndex) => currentIndex !== index);
}

function handleGenerate() {
  addItem();
  emit("generate");
}

function handleClear() {
  currentItem.value = "";
  emit("clear");
}

const hasUnicodeInput = computed(() =>
  hasNonAsciiBarcodeCharacters(value.value),
);
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
          v-model="currentItem"
          type="text"
          class="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="e.g. 8851234567890"
          @keydown.enter.prevent="handleGenerate"
        />

        <div
          v-if="items.length > 0"
          class="max-h-40 space-y-2 overflow-auto rounded-xl border bg-gray-50 p-2"
        >
          <div
            v-for="(item, index) in items"
            :key="`${item}-${index}`"
            class="flex items-center gap-2 rounded-lg border bg-white px-2 py-1.5"
          >
            <p class="flex-1 truncate text-xs text-gray-700">
              {{ item }}
            </p>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              @click="removeItem(index)"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            type="button"
            @click="handleGenerate"
          >
            Generate
          </button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            type="button"
            @click="handleClear"
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

        <p class="text-xs text-gray-500">
          Enter a value and click Generate to add it to the list.
        </p>

        <div
          v-if="hasUnicodeInput"
          class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
        >
          For Khmer language, QR Code is recommended. Standard barcodes support
          only numbers and basic English characters.
          <NuxtLink to="/tools/qr" class="font-semibold underline">
            Open QR Generator
          </NuxtLink>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold">Options</h3>

        <div
          class="grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 sm:grid-cols-2"
        >
          <div>
            <p class="font-semibold text-gray-900">Barcode generator</p>
            <ul class="mt-2 list-disc space-y-1 pl-4">
              <li>Numbers and basic English only</li>
              <li>Good for product codes, SKU, POS item code</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-900">QR code generator</p>
            <ul class="mt-2 list-disc space-y-1 pl-4">
              <li>Supports Khmer, emoji, links, and long text</li>
              <li>Good for Khmer content</li>
            </ul>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >
              Format
            </label>

            <select
              v-model="format"
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
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
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
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
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
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
          checksum auto). Use <b>CODE128</b> for ASCII text or numbers.
        </p>
      </div>
    </div>
  </section>
</template>
