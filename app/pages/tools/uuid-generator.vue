<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ isKhmer ? "បង្កើតកូដ UUID (v4)" : "UUID Generator" }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ isKhmer ? "បង្កើតកូដ UUID v4 ចៃដន្យម្តងមួយ ឬច្រើនក្នុងពេលតែមួយ និងចម្លងជាបញ្ជី។" : "Generate one or many random v4 UUIDs and copy them as a list." }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 md:grid-cols-[220px_1fr]">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ isKhmer ? "ចំនួន" : "Quantity" }}
          </label>
          <input
            v-model.number="count"
            type="number"
            min="1"
            max="500"
            class="h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="generate"
            >
              {{ isKhmer ? "បង្កើតថ្មី" : "Generate" }}
            </button>
            <CopyButton :text="uuidText" :label="isKhmer ? 'ចម្លងទាំងអស់' : 'Copy all'" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ isKhmer ? "បញ្ជីកូដ UUID v4" : "UUID v4 list" }}
          </label>
          <textarea
            :value="uuidText"
            readonly
            class="h-96 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="isKhmer ? 'កូដ UUID ដែលបានបង្កើតនឹងបង្ហាញនៅទីនេះ' : 'Generated UUIDs appear here'"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { generateUuidV4 } from "~/lib/developer-tools";

const { isKhmer } = useLanguage();

useSeoMeta({
  title: "UUID Generator - ChlatWork",
  description: "Generate v4 UUIDs in bulk and copy them instantly.",
  ogTitle: "UUID Generator - ChlatWork",
  ogDescription: "Simple browser-based UUID v4 generator.",
});

const count = ref(5);
const uuids = ref<string[]>([]);
const uuidText = computed(() => uuids.value.join("\n"));

onMounted(() => {
  generate();
});

function generate() {
  const safeCount = Math.max(1, Math.min(500, Math.trunc(Number(count.value) || 1)));
  count.value = safeCount;
  uuids.value = Array.from({ length: safeCount }, () => generateUuidV4());
}
</script>
