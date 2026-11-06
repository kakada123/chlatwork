<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.hashGenerator.hashGenerator") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.hashGenerator.generateMd5Sha1Sha256AndSha512") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          {{ t("tools.hashGenerator.textInput") }}
        </label>
        <textarea
          v-model="input"
          class="h-56 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          :placeholder="t(&quot;tools.hashGenerator.textToHash&quot;)"
        />
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="isHashing"
            @click="generate"
          >
            {{ isHashing ? (t("tools.hashGenerator.generating")) : (t("tools.hashGenerator.generateHashes")) }}
          </button>
          <button
            type="button"
            class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="clearAll"
          >
            {{ t("tools.hashGenerator.clear") }}
          </button>
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ localizeToolError(error, isKhmer) }}</p>
      </div>
    </section>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-sm font-semibold text-gray-900">
        {{ t("tools.hashGenerator.hashes") }}
      </h2>
      <div class="space-y-3">
        <div
          v-for="algorithm in algorithms"
          :key="algorithm"
          class="rounded-lg border border-gray-200 bg-gray-50 p-3"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-gray-700">{{ algorithm }}</p>
            <CopyButton :text="results[algorithm]" :label="t(&quot;tools.hashGenerator.copy&quot;)" />
          </div>
          <p class="break-all font-mono text-sm text-gray-700">
            {{ results[algorithm] || (t("tools.hashGenerator.runTheGeneratorToSeeOutput")) }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { hashText, type HashAlgorithm } from "~/lib/developer-tools";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.hashGenerator.metaTitle"),
  description: () => t("tools.hashGenerator.metaDescription"),
  ogTitle: () => t("tools.hashGenerator.metaOgTitle"),
  ogDescription: () => t("tools.hashGenerator.metaOgDescription"),
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
