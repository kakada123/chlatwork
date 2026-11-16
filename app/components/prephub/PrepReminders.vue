<script setup lang="ts">
import {
  inputToInstant,
  type PrepSubject,
  type PrepMutation,
} from "~/lib/prephub";
const props = defineProps<{
  subject: PrepSubject;
  timeZone: string;
  busy: boolean;
  mutate: PrepMutation;
  confirm: (action: () => Promise<boolean>) => void;
}>();
const { t } = useAppI18n();
const choice = ref("60");
const custom = ref("");
const error = ref("");
const schedule = computed(
  () => props.subject.eventAt || props.subject.deadlineAt,
);
const presets = [
  { value: "1440", key: "dayBefore" },
  { value: "60", key: "hourBefore" },
  { value: "30", key: "halfHourBefore" },
  { value: "10", key: "tenBefore" },
  { value: "custom", key: "custom" },
];
async function add() {
  error.value = "";
  try {
    const remindAt =
      choice.value === "custom"
        ? inputToInstant(custom.value, props.timeZone)
        : new Date(
            new Date(schedule.value!).getTime() - Number(choice.value) * 60000,
          ).toISOString();
    if (!remindAt || new Date(remindAt).getTime() <= Date.now())
      throw new Error(t("prephub.reminderTime"));
    if (await props.mutate("/reminders", "POST", { remindAt }))
      custom.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
</script>
<template>
  <section class="prep-panel">
    <h2 class="font-semibold">{{ t("prephub.reminders") }}</h2>
    <p class="mt-2 text-xs text-slate-500">
      {{ t("prephub.reminderHint", { timeZone }) }}
    </p>
    <ul class="mt-3 space-y-2">
      <li
        v-for="r in subject.reminders"
        :key="r.id"
        class="flex flex-wrap items-center justify-between gap-2 text-sm"
      >
        <span
          >{{ date(r.remindAt)
          }}<span v-if="r.dismissedAt" class="text-slate-500">
            · {{ t("prephub.dismissed") }}</span
          ></span
        >
        <div class="flex gap-2">
          <button
            v-if="
              !r.dismissedAt && new Date(r.remindAt).getTime() <= Date.now()
            "
            type="button"
            class="prep-button"
            :disabled="busy"
            @click="mutate(`/reminders/${r.id}`, 'PATCH')"
          >
            {{ t("prephub.dismiss") }}</button
          ><button
            type="button"
            class="prep-button"
            :disabled="busy"
            @click="confirm(() => mutate(`/reminders/${r.id}`, 'DELETE'))"
          >
            {{ t("prephub.delete") }}
          </button>
        </div>
      </li>
    </ul>
    <form v-if="schedule" class="mt-4 space-y-3" @submit.prevent="add">
      <label class="prep-label"
        >{{ t("prephub.reminderTime")
        }}<select v-model="choice" class="prep-input">
          <option v-for="p in presets" :key="p.value" :value="p.value">
            {{ t(`prephub.${p.key}`) }}
          </option>
        </select></label
      ><input
        v-if="choice === 'custom'"
        v-model="custom"
        type="datetime-local"
        class="prep-input"
        required
        :aria-label="t('prephub.custom')"
      />
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <button class="prep-button" :disabled="busy">
        {{ t("prephub.addReminder") }}
      </button>
    </form>
    <p v-else class="mt-3 text-sm text-slate-500">
      {{ t("prephub.reminderSchedule") }}
    </p>
  </section>
</template>
