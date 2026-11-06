<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold">
        {{ t("tools.unixTimestamp.unixTimestampConverter") }}
      </h1>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">
        {{ t("tools.unixTimestamp.convertUnixTimestampsToReadableDatesAndConvertDate") }}
      </p>
    </div>

    <section class="rounded-xl border bg-white p-4 shadow-sm">
      <div class="mb-4 max-w-sm">
        <label class="block text-sm font-semibold text-gray-900">
          {{ t("tools.unixTimestamp.timezone") }}
        </label>
        <ModernSelect
          v-model="timeZone"
          class="mt-2 h-11 w-full rounded-lg border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
        >
          <option v-for="zone in timeZoneOptions" :key="zone" :value="zone">
            {{ zone }}
          </option>
        </ModernSelect>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 class="text-sm font-semibold text-gray-900">
            {{ t("tools.unixTimestamp.timestampToDate") }}
          </h2>
          <input
            v-model="timestampInput"
            class="h-11 w-full rounded-lg border px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-gray-900/20"
            :placeholder="t(&quot;tools.unixTimestamp.1715000000Or1715000000000&quot;)"
          />
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
              @click="convertTimestamp"
            >
              {{ t("tools.unixTimestamp.convert") }}
            </button>
            <button
              type="button"
              class="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              @click="useNow"
            >
              {{ t("tools.unixTimestamp.useNow") }}
            </button>
          </div>
          <p v-if="timestampError" class="text-sm text-red-600">{{ localizeToolError(timestampError, isKhmer) }}</p>
          <dl v-if="timestampResult" class="space-y-2 text-sm">
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">
                {{ t("tools.unixTimestamp.selectedTimezone") }}
              </dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.zone }}</dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">UTC ISO</dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.iso }}</dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">
                {{ t("tools.unixTimestamp.seconds") }}
              </dt>
              <dd class="mt-1 break-words font-mono">{{ timestampResult.seconds }}</dd>
            </div>
          </dl>
        </div>

        <div class="space-y-3 rounded-lg border border-gray-200 p-3">
          <h2 class="text-sm font-semibold text-gray-900">
            {{ t("tools.unixTimestamp.dateToTimestamp") }}
          </h2>
          <ModernDateInput
            v-model="dateInput"
            type="datetime-local"
            size="sm"
            :aria-label="t(&quot;tools.unixTimestamp.chooseDateAndTime&quot;)"
          />
          <button
            type="button"
            class="h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800"
            @click="convertDate"
          >
            {{ t("tools.unixTimestamp.convert") }}
          </button>
          <p v-if="dateError" class="text-sm text-red-600">{{ localizeToolError(dateError, isKhmer) }}</p>
          <dl v-if="dateResult" class="space-y-2 text-sm">
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">
                {{ t("tools.unixTimestamp.seconds") }}
              </dt>
              <dd class="mt-1 flex items-center justify-between gap-3 font-mono">
                <span class="break-all">{{ dateResult.seconds }}</span>
                <CopyButton :text="dateResult.seconds" :label="t(&quot;tools.unixTimestamp.copy&quot;)" />
              </dd>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <dt class="font-semibold text-gray-700">
                {{ t("tools.unixTimestamp.milliseconds") }}
              </dt>
              <dd class="mt-1 flex items-center justify-between gap-3 font-mono">
                <span class="break-all">{{ dateResult.milliseconds }}</span>
                <CopyButton :text="dateResult.milliseconds" :label="t(&quot;tools.unixTimestamp.copy&quot;)" />
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
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeToolError } from "~/data/tool-ui-km";
import { useLanguage } from "~/composables/useLanguage";
import CopyButton from "~/components/developer-tools/CopyButton.vue";

const { isKhmer } = useLanguage();
import {
  COMMON_TIME_ZONES,
  formatDateInTimeZone,
  parseTimestampInput,
  toDateTimeLocalValue,
  zonedDateTimeToUtcMillis,
} from "~/lib/developer-tools";

const { t } = useAppI18n();




useSeoMeta({
  title: () => t("tools.unixTimestamp.metaTitle"),
  description: () => t("tools.unixTimestamp.metaDescription"),
  ogTitle: () => t("tools.unixTimestamp.metaOgTitle"),
  ogDescription: () => t("tools.unixTimestamp.metaOgDescription"),
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
