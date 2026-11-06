<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.cronExplainer.cronExpressionExplainer") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.cronExplainer.explainStandard5FieldCronExpressionsAndPreviewThe") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">
          {{ t("tools.cronExplainer.cronExpression") }}
        </label>
        <input
          v-model="expression"
          class="h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="*/5 * * * *"
          @keyup.enter="explain"
        />

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            @click="explain"
          >
            {{ t("tools.cronExplainer.explain") }}
          </button>
          <button
            v-for="example in examples"
            :key="example.value"
            type="button"
            class="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="loadExample(example.value)"
          >
            {{ example.label }}
          </button>
        </div>

        <p class="text-xs text-gray-500">
          {{ t("tools.cronExplainer.supports5FieldsMinuteHourDayOfMonthMonth") }}
        </p>
        <p v-if="error" class="text-sm text-red-600">{{ localizeToolError(error, isKhmer) }}</p>
      </div>
    </section>

    <section v-if="explanation.length" class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-3 flex h-10 items-center">
          <h2 class="text-sm font-semibold text-gray-900">
            {{ t("tools.cronExplainer.explanation") }}
          </h2>
        </div>
        <ul class="space-y-2 text-sm text-gray-700">
          <li
            v-for="line in explanation"
            :key="line"
            class="rounded-lg bg-gray-50 px-3 py-2"
          >
            {{ localizeCronLine(line, isKhmer) }}
          </li>
        </ul>
        <p class="mt-3 text-xs text-gray-500">
          {{ t("tools.cronExplainer.whenBothDayOfMonthAndDayOfWeek") }}
        </p>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-3 flex h-10 items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">
            {{ t("tools.cronExplainer.next5RunTimes") }}
          </h2>
          <CopyButton :text="runsText" :label="t(&quot;tools.cronExplainer.copy&quot;)" />
        </div>
        <ol class="space-y-2 text-sm text-gray-700">
          <li
            v-for="run in runs"
            :key="run.toISOString()"
            class="rounded-lg bg-gray-50 px-3 py-2 font-mono"
          >
            {{ formatRun(run) }}
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError, localizeCronLine } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { getNextCronRuns } from "~/lib/developer-tools";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();




useSeoMeta({
  title: () => t("tools.cronExplainer.metaTitle"),
  description: () => t("tools.cronExplainer.metaDescription"),
  ogTitle: () => t("tools.cronExplainer.metaOgTitle"),
  ogDescription: () => t("tools.cronExplainer.metaOgDescription"),
});

const expression = ref("*/5 * * * *");
const explanation = ref<string[]>([]);
const runs = ref<Date[]>([]);
const error = ref("");
const examples = computed(() => [
  { label: t("tools.cronExplainer.every5Min"), value: "*/5 * * * *" },
  { label: t("tools.cronExplainer.daily9Am"), value: "0 9 * * *" },
  { label: t("tools.cronExplainer.weekdays"), value: "0 9 * * 1-5" },
  { label: t("tools.cronExplainer.monthly"), value: "0 0 1 * *" },
]);

const runsText = computed(() => runs.value.map((run) => formatRun(run)).join("\n"));

onMounted(() => {
  explain();
});

function explain() {
  const result = getNextCronRuns(expression.value, 5);
  explanation.value = result.explanation;
  runs.value = result.runs;
  error.value = result.error;
}

function loadExample(value: string) {
  expression.value = value;
  explain();
}

function formatRun(date: Date) {
  return new Intl.DateTimeFormat((isKhmer.value ? "km-KH" : "en-US"), {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}
</script>
