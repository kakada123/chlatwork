<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Cron Expression Explainer</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Explain standard 5-field cron expressions and preview the next five local run times.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="space-y-3">
        <label class="block text-sm font-semibold text-gray-900">Cron expression</label>
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
            Explain
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
          Supports 5 fields: minute, hour, day of month, month, day of week.
        </p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      </div>
    </section>

    <section v-if="explanation.length" class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-3 flex h-10 items-center">
          <h2 class="text-sm font-semibold text-gray-900">Explanation</h2>
        </div>
        <ul class="space-y-2 text-sm text-gray-700">
          <li
            v-for="line in explanation"
            :key="line"
            class="rounded-lg bg-gray-50 px-3 py-2"
          >
            {{ line }}
          </li>
        </ul>
        <p class="mt-3 text-xs text-gray-500">
          When both day-of-month and day-of-week are restricted, this uses common cron OR
          matching.
        </p>
      </div>

      <div class="rounded-xl border bg-white p-4 shadow-sm">
        <div class="mb-3 flex h-10 items-center justify-between gap-3">
          <h2 class="text-sm font-semibold text-gray-900">Next 5 run times</h2>
          <CopyButton :text="runsText" label="Copy" />
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
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import { getNextCronRuns } from "~/lib/developer-tools";

useSeoMeta({
  title: "Cron Expression Explainer - ChlatWork",
  description: "Explain cron expressions and preview the next five run times.",
  ogTitle: "Cron Expression Explainer - ChlatWork",
  ogDescription: "Cron expression explanation and next run previews.",
});

const expression = ref("*/5 * * * *");
const explanation = ref<string[]>([]);
const runs = ref<Date[]>([]);
const error = ref("");
const examples = [
  { label: "Every 5 min", value: "*/5 * * * *" },
  { label: "Daily 9 AM", value: "0 9 * * *" },
  { label: "Weekdays", value: "0 9 * * 1-5" },
  { label: "Monthly", value: "0 0 1 * *" },
];

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
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}
</script>
