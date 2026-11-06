<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ isKhmer ? "បង្កើតពាក្យសម្ងាត់សុវត្ថិភាព" : "Password Generator" }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ isKhmer ? "បង្កើតពាក្យសម្ងាត់ចៃដន្យរឹងមាំ ដោយអាចកំណត់ប្រវែង និងប្រភេទតួអក្សរបានតាមតម្រូវការ។" : "Generate strong random passwords with length and character-set controls." }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-900">
              {{ isKhmer ? "ប្រវែង" : "Length" }}: {{ options.length }}
            </label>
            <input
              v-model.number="options.length"
              type="range"
              min="8"
              max="128"
              class="mt-2 w-full"
            />
            <input
              v-model.number="options.length"
              type="number"
              min="8"
              max="256"
              class="mt-2 h-11 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          <div class="space-y-2">
            <label
              v-for="item in optionRows"
              :key="item.key"
              class="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <input v-model="options[item.key]" type="checkbox" class="h-4 w-4" />
              <span>{{ item.label }}</span>
            </label>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="generate"
            >
              {{ isKhmer ? "បង្កើតថ្មី" : "Generate" }}
            </button>
            <CopyButton :text="password" :label="isKhmer ? 'ចម្លង' : 'Copy'" />
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ isKhmer ? "ពាក្យសម្ងាត់ដែលបានបង្កើត" : "Generated password" }}
          </label>
          <textarea
            v-model="password"
            readonly
            class="h-64 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="isKhmer ? 'ពាក្យសម្ងាត់ដែលបានបង្កើតនឹងបង្ហាញនៅទីនេះ' : 'Generated password appears here'"
          />
          <p class="text-xs text-gray-500">
            {{ isKhmer ? "ដំណើរការដោយប្រើ Browser Crypto API ប្រកបដោយសុវត្ថិភាព។" : "Randomness uses the browser crypto API when available." }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { generatePassword } from "~/lib/developer-tools";

const { isKhmer } = useLanguage();

useSeoMeta({
  title: "Password Generator - ChlatWork",
  description:
    "Generate strong random passwords with customizable length, symbols, numbers, and letter options.",
  ogTitle: "Password Generator - ChlatWork",
  ogDescription: "Generate strong random passwords in your browser.",
});

type PasswordOptionKey = "lowercase" | "uppercase" | "numbers" | "symbols";

const options = reactive<Record<PasswordOptionKey, boolean> & { length: number }>({
  length: 64,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
});

const optionRows = computed<Array<{ key: PasswordOptionKey; label: string }>>(() => [
  { key: "lowercase", label: isKhmer.value ? "អក្សរតូច (a-z)" : "Lowercase letters" },
  { key: "uppercase", label: isKhmer.value ? "អក្សរធំ (A-Z)" : "Uppercase letters" },
  { key: "numbers", label: isKhmer.value ? "លេខ (0-9)" : "Numbers" },
  { key: "symbols", label: isKhmer.value ? "និមិត្តសញ្ញា (!@#$)" : "Symbols" },
]);

const password = ref("");
const error = ref("");

onMounted(() => {
  generate();
});

function generate() {
  error.value = "";

  try {
    password.value = generatePassword(options);
  } catch (caught: any) {
    error.value = caught?.message ?? "Unable to generate password.";
    password.value = "";
  }
}
</script>
