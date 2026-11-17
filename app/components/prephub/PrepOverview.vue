<script setup lang="ts">
import {
  CalendarDays,
  Clock,
  Layers,
  Flag,
  Globe2,
  ChevronDown,
} from "lucide-vue-next";
import type { PrepSubject } from "~/lib/prephub";
import PrepFormattedText from "./PrepFormattedText.vue";
const props = defineProps<{
  subject: Pick<
    PrepSubject,
    "title" | "description" | "goal" | "status" | "eventAt" | "deadlineAt"
  >;
  timeZone: string;
}>();
const { t } = useAppI18n();
const expanded = ref(false),
  detailsOpen = ref(false),
  detailsId = useId(),
  descriptionId = useId();
const longDescription = computed(
  () =>
    props.subject.description.length > 180 ||
    props.subject.description.split("\n").length > 3,
);
const hasDetails = computed(() =>
  Boolean(
    props.subject.eventAt || props.subject.deadlineAt || props.subject.goal,
  ),
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
  <header class="prep-overview">
    <div class="prep-panel prep-overview-main">
      <div class="flex min-w-0 items-start gap-3 sm:gap-4">
        <span class="prep-overview-icon" aria-hidden="true"
          ><Layers class="size-6 sm:size-8"
        /></span>
        <div class="min-w-0 flex-1">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span
              class="prep-status"
              :class="`prep-status--${subject.status.toLowerCase()}`"
              ><span
                class="size-2 rounded-full bg-current"
                aria-hidden="true"
              />{{ t(`prephub.${subject.status}`) }}</span
            ><slot name="badge" />
          </div>
          <h1
            class="break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          >
            {{ subject.title }}
          </h1>
          <p
            v-if="subject.eventAt || subject.deadlineAt"
            class="mt-3 text-xs text-slate-500"
          >
            {{
              t(
                subject.eventAt
                  ? "prephub.sharedEventAt"
                  : "prephub.sharedDeadline",
              )
            }}: {{ date((subject.eventAt || subject.deadlineAt)!, timeZone) }}
          </p>
        </div>
      </div>
      <PrepFormattedText
        v-if="subject.description"
        :id="descriptionId"
        :text="subject.description"
        class="mt-3 text-slate-600 dark:text-white/70"
        :class="{ 'line-clamp-3': longDescription && !expanded }"
      /><button
        v-if="longDescription"
        type="button"
        class="min-h-11 text-sm font-semibold text-sky-700 dark:text-sky-300"
        :aria-expanded="expanded"
        :aria-controls="descriptionId"
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
    <section
      v-if="hasDetails"
      class="space-y-3"
      :aria-label="t('prephub.visual.subjectDetails')"
    >
      <button
        type="button"
        class="prep-button w-full"
        :aria-expanded="detailsOpen"
        :aria-controls="detailsId"
        @click="detailsOpen = !detailsOpen"
      >
        {{ t("prephub.visual.datesAndGoal")
        }}<ChevronDown
          class="size-4"
          :class="{ 'rotate-180': detailsOpen }"
          aria-hidden="true"
        />
      </button>
      <div :id="detailsId" :hidden="!detailsOpen" class="space-y-3">
        <dl
          v-if="subject.eventAt || subject.deadlineAt"
          class="prep-panel prep-schedule"
        >
          <div v-if="subject.eventAt" class="prep-schedule-row">
            <span class="prep-detail-icon text-sky-700 dark:text-sky-300"
              ><CalendarDays class="size-5" aria-hidden="true"
            /></span>
            <div class="min-w-0">
              <dt>{{ t("prephub.sharedEventAt") }}</dt>
              <dd>{{ date(subject.eventAt, timeZone) }}</dd>
            </div>
          </div>
          <div v-if="subject.deadlineAt" class="prep-schedule-row">
            <span class="prep-detail-icon"
              ><Clock class="size-5" aria-hidden="true"
            /></span>
            <div class="min-w-0">
              <dt>{{ t("prephub.sharedDeadline") }}</dt>
              <dd>{{ date(subject.deadlineAt, timeZone) }}</dd>
            </div>
          </div>
          <div class="prep-schedule-row">
            <span class="prep-detail-icon"
              ><Globe2 class="size-5" aria-hidden="true"
            /></span>
            <div class="min-w-0">
              <dt>{{ t("prephub.visual.timeZone") }}</dt>
              <dd class="break-words">{{ timeZone }}</dd>
            </div>
          </div>
        </dl>
        <section v-if="subject.goal" class="prep-panel prep-goal">
          <h2 class="mb-2 flex items-center gap-2 text-sm font-semibold">
            <span class="prep-detail-icon text-violet-700 dark:text-violet-300"
              ><Flag class="size-5" aria-hidden="true" /></span
            >{{ t("prephub.notebook.goal") }}
          </h2>
          <PrepFormattedText :text="subject.goal" />
        </section>
      </div>
    </section>
  </header>
</template>
