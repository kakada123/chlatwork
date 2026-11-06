<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
const { isKhmer } = useLanguage();
import type { QrEcLevel } from "~/lib/qr-generator";

const { t } = useAppI18n();

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
const currentItem = ref("");

const items = computed<string[]>({
  get() {
    return text.value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  },
  set(nextItems) {
    text.value = nextItems.join("\n");
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
</script>

<template>
  <section class="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
    <h2 class="text-sm font-semibold">{{ t("tools.qr.input") }}</h2>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="space-y-2">
        <label
          class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
        >{{ t("tools.qr.textUrl") }}</label>

        <input
          v-model="currentItem"
          type="text"
          class="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          :placeholder="t(&quot;tools.qr.eGHttpsChlatworkCom&quot;)"
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
            >{{ t("tools.qr.remove") }}</button>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            class="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            type="button"
            @click="handleGenerate"
          >{{ t("tools.qr.generate") }}</button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            type="button"
            @click="handleClear"
          >{{ t("tools.qr.clear") }}</button>

          <button
            class="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            :disabled="!generated"
            @click="emit('download')"
          >{{ t("tools.qr.downloadPng") }}</button>
        </div>

        <p v-if="error" class="text-sm text-red-600">
          {{ localizeToolError(error, isKhmer) }}
        </p>

        <p class="text-xs text-gray-500">{{ t("tools.qr.enterAValueAndClickGenerateToAddIt") }}</p>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-semibold">{{ t("tools.qr.options") }}</h3>

        <div class="grid gap-3 sm:grid-cols-2">
          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >{{ t("tools.qr.sizePx") }}</label>
            <input
              v-model.number="size"
              type="number"
              min="160"
              max="1024"
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >{{ t("tools.qr.margin") }}</label>
            <input
              v-model.number="margin"
              type="number"
              min="0"
              max="10"
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div>
            <label
              class="block text-xs font-semibold uppercase tracking-wide text-gray-500"
            >{{ t("tools.qr.errorCorrection") }}</label>
            <ModernSelect
              v-model="ecLevel"
              class="mt-1 h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            >
              <option value="L">L (7%)</option>
              <option value="M">M (15%)</option>
              <option value="Q">Q (25%)</option>
              <option value="H">H (30%)</option>
            </ModernSelect>
          </div>

          <div class="flex items-end gap-2">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="autoGenerate" type="checkbox" />{{ t("tools.qr.autoGenerate") }}</label>
          </div>
        </div>

        <p class="text-xs text-gray-500">
          {{ t("tools.qr.tipUseHForPrintingMForNormalWeb") }}
        </p>
      </div>
    </div>
  </section>
</template>
