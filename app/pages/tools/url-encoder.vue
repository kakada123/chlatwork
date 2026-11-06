<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.urlEncoder.urlEncoderDecoder") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.urlEncoder.encodeAndDecodeUrlComponentsQueryStringsAndPasted") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-2">
          <div class="flex h-10 items-center">
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.urlEncoder.input") }}
            </label>
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
              {{ t("tools.urlEncoder.encode") }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="run('decode')"
            >
              {{ t("tools.urlEncoder.decode") }}
            </button>
            <button
              type="button"
              class="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="clearAll"
            >
              {{ t("tools.urlEncoder.clear") }}
            </button>
          </div>
          <p v-if="error" class="text-sm text-red-600">{{ localizeToolError(error, isKhmer) }}</p>
        </div>

        <div class="space-y-2">
          <div class="flex h-10 items-center justify-between gap-3">
            <label class="block text-sm font-semibold text-gray-900">
              {{ t("tools.urlEncoder.result") }}
            </label>
            <CopyButton :text="result" :label="t(&quot;tools.urlEncoder.copyResult&quot;)" />
          </div>
          <textarea
            v-model="result"
            readonly
            class="h-72 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="t(&quot;tools.urlEncoder.encodedOrDecodedResultAppearsHere&quot;)"
          />
        </div>
      </div>
    </section>

    <section v-if="queryRows.length" class="rounded-xl border bg-white p-4 shadow-sm">
      <h2 class="mb-3 text-sm font-semibold text-gray-900">
        {{ t("tools.urlEncoder.decodedQueryParameters") }}
      </h2>
      <div class="overflow-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left">
            <tr>
              <th class="p-2 font-semibold">{{ t("tools.urlEncoder.key") }}</th>
              <th class="p-2 font-semibold">{{ t("tools.urlEncoder.value") }}</th>
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
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.urlEncoder.metaTitle"),
  description: () => t("tools.urlEncoder.metaDescription"),
  ogTitle: () => t("tools.urlEncoder.metaOgTitle"),
  ogDescription: () => t("tools.urlEncoder.metaOgDescription"),
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
