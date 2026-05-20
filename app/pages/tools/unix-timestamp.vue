<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">Unix Timestamp Converter</h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        Convert Unix timestamps to readable dates and convert date-time values back to timestamps.
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-4 max-w-sm">
        <label class="block text-sm font-semibold text-gray-900">Timezone</label>
        <select
          v-model="timeZone"
          class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
        >
          <option v-for="zone in timeZoneOptions" :key="zone" :value="zone">
            {{ zone }}
          </option>
        </select>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 class="text-sm font-semibold text-gray-900">Timestamp to date</h2>
          <input
            v-model="timestampInput"
            class="h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            placeholder="1715000000 or 1715000000000"
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="convertTimestamp"
            >
              Convert
            </button>
            <button
              type="button"
              class="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="useNow"
            >
              Use now
            </button>
          </div>
          <p v-if="timestampError" class="text-sm text-red-600">{{ timestampError }}</p>
          <dl v-if="timestampResult" class="space-y-2 text-sm">
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">Selected timezone</dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.zone }}</dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">UTC ISO</dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.iso }}</dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">Seconds</dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.seconds }}</dd>
            </div>
          </dl>
        </div>

        <div class="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 class="text-sm font-semibold text-gray-900">Date to timestamp</h2>
          <ModernDateInput
            v-model="dateInput"
            type="datetime-local"
            size="sm"
            aria-label="Choose date and time"
          />
          <button
            type="button"
            class="h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            @click="convertDate"
          >
            Convert
          </button>
          <p v-if="dateError" class="text-sm text-red-600">{{ dateError }}</p>
          <dl v-if="dateResult" class="space-y-2 text-sm">
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">Seconds</dt>
              <dd class="mt-1 flex items-center justify-between gap-3 font-mono">
                <span class="break-all">{{ dateResult.seconds }}</span>
                <CopyButton :text="dateResult.seconds" label="Copy" />
              </dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">Milliseconds</dt>
              <dd class="mt-1 flex items-center justify-between gap-3 font-mono">
                <span class="break-all">{{ dateResult.milliseconds }}</span>
                <CopyButton :text="dateResult.milliseconds" label="Copy" />
              </dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">UTC ISO</dt>
              <dd class="mt-1 break-words font-mono">{{ dateResult.iso }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import CopyButton from "~/components/developer-tools/CopyButton.vue";
import {
  COMMON_TIME_ZONES,
  formatDateInTimeZone,
  parseTimestampInput,
  toDateTimeLocalValue,
  zonedDateTimeToUtcMillis,
} from "~/lib/developer-tools";

useSeoMeta({
  title: "Unix Timestamp Converter - ChlatWork",
  description:
    "Convert Unix timestamps to readable dates and convert date-time values to seconds or milliseconds.",
  ogTitle: "Unix Timestamp Converter - ChlatWork",
  ogDescription: "Timestamp conversion with timezone support.",
});

const browserTimeZone = ref("UTC");
const timeZone = ref("UTC");
const timestampInput = ref("");
const dateInput = ref("");
const timestampError = ref("");
const dateError = ref("");
const timestampResult = ref<null | {
  zone: string;
  iso: string;
  seconds: string;
}>(null);
const dateResult = ref<null | {
  seconds: string;
  milliseconds: string;
  iso: string;
}>(null);

const timeZoneOptions = computed(() =>
  Array.from(new Set([browserTimeZone.value, ...COMMON_TIME_ZONES])),
);

onMounted(() => {
  browserTimeZone.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  timeZone.value = browserTimeZone.value;
  useNow();
  dateInput.value = toDateTimeLocalValue(new Date());
  convertDate();
});

watch(timeZone, () => {
  if (!import.meta.client) return;
  convertTimestamp();
  convertDate();
});

function useNow() {
  timestampInput.value = String(Math.floor(Date.now() / 1000));
  convertTimestamp();
}

function convertTimestamp() {
  timestampError.value = "";
  const date = parseTimestampInput(timestampInput.value);

  if (!date || Number.isNaN(date.getTime())) {
    timestampError.value = "Enter a valid Unix timestamp in seconds or milliseconds.";
    timestampResult.value = null;
    return;
  }

  try {
    timestampResult.value = {
      zone: formatDateInTimeZone(date, timeZone.value),
      iso: date.toISOString(),
      seconds: String(Math.floor(date.getTime() / 1000)),
    };
  } catch (caught: any) {
    timestampError.value = caught?.message ?? "Invalid timezone.";
    timestampResult.value = null;
  }
}

function convertDate() {
  dateError.value = "";
  const millis = zonedDateTimeToUtcMillis(dateInput.value, timeZone.value);

  if (millis === null || Number.isNaN(millis)) {
    dateError.value = "Choose a valid date and time.";
    dateResult.value = null;
    return;
  }

  const date = new Date(millis);
  dateResult.value = {
    seconds: String(Math.floor(millis / 1000)),
    milliseconds: String(millis),
    iso: date.toISOString(),
  };
}
</script>
