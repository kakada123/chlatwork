<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.uuidGenerator.uuidGenerator") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.uuidGenerator.generateOneOrManyRandomV4UuidsAndCopy") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="grid gap-4 md:grid-cols-[220px_1fr]">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ t("tools.uuidGenerator.quantity") }}
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
              {{ t("tools.uuidGenerator.generate") }}
            </button>
            <CopyButton :text="uuidText" :label="t(&quot;tools.uuidGenerator.copyAll&quot;)" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-semibold text-gray-900">
            {{ t("tools.uuidGenerator.uuidV4List") }}
          </label>
          <textarea
            :value="uuidText"
            readonly
            class="h-96 w-full resize-y rounded-lg border bg-gray-50 px-3 py-2 font-mono text-sm outline-none"
            :placeholder="t(&quot;tools.uuidGenerator.generatedUuidsAppearHere&quot;)"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { generateUuidV4 } from "~/lib/developer-tools";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.uuidGenerator.metaTitle"),
  description: () => t("tools.uuidGenerator.metaDescription"),
  ogTitle: () => t("tools.uuidGenerator.metaOgTitle"),
  ogDescription: () => t("tools.uuidGenerator.metaOgDescription"),
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
