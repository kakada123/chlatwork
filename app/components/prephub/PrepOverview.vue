<script setup lang="ts">
import { CalendarDays, Clock } from "lucide-vue-next";
import type { PrepSubject } from "~/lib/prephub";
import PrepFormattedText from "./PrepFormattedText.vue";
const props = defineProps<{
  subject: Pick<
    PrepSubject,
    | "title"
    | "description"
    | "goal"
    | "status"
    | "eventAt"
    | "deadlineAt"
    | "progress"
  >;
  timeZone: string;
}>();
const { t } = useAppI18n();
const expanded = ref(false);
const longDescription = computed(
  () =>
    props.subject.description.length > 180 ||
    props.subject.description.split("\n").length > 3,
);
watch(
  () => props.subject.description,
  () => {
    expanded.value = false;
  },
);
function date(value: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
</script>
<template>
  <header class="prep-panel space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <slot name="badge" /><span
        class="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-white/70"
        >{{ t(`prephub.${subject.status}`) }}</span
      >
    </div>
    <div>
      <h1 class="break-words text-xl font-bold leading-snug sm:text-2xl">
        {{ subject.title }}
      </h1>
      <PrepFormattedText
        v-if="subject.description"
        :text="subject.description"
        class="mt-2 text-slate-600 dark:text-white/70"
        :class="{ 'line-clamp-3': longDescription && !expanded }"
      /><button
        v-if="longDescription"
        type="button"
        class="min-h-11 text-sm font-semibold text-sky-700 dark:text-sky-300"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{
          t(
            expanded
              ? "prephub.notebook.showLess"
              : "prephub.notebook.readMore",
          )
        }}
      </button>
    </div>
    <div
      v-if="subject.eventAt || subject.deadlineAt"
      class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"
    >
      <p v-if="subject.eventAt" class="inline-flex items-center gap-1.5">
        <CalendarDays class="size-4 shrink-0" aria-hidden="true" /><span
          >{{ t("prephub.sharedEventAt") }}:
          {{ date(subject.eventAt, timeZone) }}</span
        >
      </p>
      <p v-if="subject.deadlineAt" class="inline-flex items-center gap-1.5">
        <Clock class="size-4 shrink-0" aria-hidden="true" /><span
          >{{ t("prephub.sharedDeadline") }}:
          {{ date(subject.deadlineAt, timeZone) }}</span
        >
      </p>
      <span>{{ timeZone }}</span>
    </div>
    <details v-if="subject.goal" class="group">
      <summary
        class="min-h-11 cursor-pointer content-center text-sm font-semibold text-slate-600 dark:text-white/70"
      >
        {{ t("prephub.notebook.goal") }}
      </summary>
      <PrepFormattedText :text="subject.goal" class="pb-2" />
    </details>
    <div
      v-if="subject.progress.total"
      class="space-y-2 border-t border-slate-100 pt-3 dark:border-white/10"
    >
      <p class="text-sm font-medium">
        {{
          t("prephub.notebook.progress", {
            completed: subject.progress.completed,
            total: subject.progress.total,
          })
        }}
      </p>
      <progress
        class="block h-2 w-full accent-sky-700"
        :value="subject.progress.completed"
        :max="subject.progress.total"
        :aria-label="t('prephub.notebook.preparation')"
      />
    </div>
    <p
      v-else
      class="border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-white/10"
    >
      {{ t("prephub.notebook.noTasksProgress") }}
    </p>
  </header>
</template>
