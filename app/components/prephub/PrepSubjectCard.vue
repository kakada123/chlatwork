<script setup lang="ts">
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Globe2,
  ListChecks,
  MoreHorizontal,
  ClipboardCheck,
  Plus,
} from "lucide-vue-next";
import { getDatePickerPosition } from "~/lib/date-picker-position";
import type { PrepSubjectSummary } from "~/lib/prephub";
import PrepCategoryIcon from "./PrepCategoryIcon.vue";
const props = defineProps<{
  subject: PrepSubjectSummary;
  timeZone: string;
  busy?: boolean;
}>();
const emit = defineEmits<{ task: [subject: PrepSubjectSummary] }>();
const { t } = useAppI18n(),
  { linkTo } = useProductDomain();
const menu = ref<HTMLDetailsElement | null>(null),
  trigger = ref<HTMLElement | null>(null),
  panel = ref<HTMLElement | null>(null),
  panelStyle = ref<Record<string, string>>({});
function date(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function cleanup() {
  document.removeEventListener("pointerdown", outside);
  window.removeEventListener("resize", position);
  window.removeEventListener("scroll", position, true);
}
function close(restore = false) {
  panel.value?.hidePopover?.();
  if (menu.value) menu.value.open = false;
  if (restore) trigger.value?.focus();
  cleanup();
}
function outside(event: PointerEvent) {
  if (event.target instanceof Node && !menu.value?.contains(event.target))
    close();
}
function position() {
  if (!menu.value?.open || !trigger.value || !panel.value) return;
  const p = getDatePickerPosition(
    trigger.value.getBoundingClientRect(),
    { width: panel.value.offsetWidth, height: panel.value.scrollHeight },
    { width: document.documentElement.clientWidth, height: window.innerHeight },
    "bottom",
    window.innerWidth < 640,
  );
  panelStyle.value = {
    top: `${p.top}px`,
    left: `${p.left}px`,
    maxHeight: `${p.maxHeight}px`,
  };
}
async function toggle() {
  cleanup();
  if (!menu.value?.open) {
    panel.value?.hidePopover?.();
    return;
  }
  await nextTick();
  if (!menu.value?.open) return;
  panel.value?.showPopover?.();
  position();
  panel.value?.querySelector<HTMLElement>("a,button:not(:disabled)")?.focus();
  document.addEventListener("pointerdown", outside);
  window.addEventListener("resize", position);
  window.addEventListener("scroll", position, true);
}
function addTask() {
  if (props.busy) return;
  close();
  emit("task", props.subject);
}
onBeforeUnmount(cleanup);
</script>
<template>
  <article
    class="prep-panel prep-subject-card"
    :class="{
      'prep-subject-card--active': !['COMPLETED', 'ARCHIVED'].includes(
        subject.status,
      ),
    }"
  >
    <div class="flex min-w-0 items-start gap-3 sm:gap-4">
      <span class="prep-subject-icon"
        ><PrepCategoryIcon
          :category="subject.category"
          class="size-6 sm:size-8"
      /></span>
      <div class="min-w-0 flex-1 space-y-3">
        <header class="flex items-start justify-between gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <h2 class="min-w-0 break-words text-lg font-bold sm:text-xl">
              <NuxtLink
                :to="linkTo(`/prephub/${subject.id}`)"
                class="rounded hover:text-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500 dark:hover:text-sky-300"
                >{{ subject.title }}</NuxtLink
              >
            </h2>
            <span class="prep-count">{{
              t(`prephub.${subject.category}`)
            }}</span
            ><span
              class="prep-status"
              :class="`prep-status--${subject.status.toLowerCase()}`"
              >{{ t(`prephub.${subject.status}`) }}</span
            >
          </div>
          <details
            ref="menu"
            class="relative shrink-0"
            @toggle="toggle"
            @keydown.esc.stop.prevent="close(true)"
          >
            <summary
              ref="trigger"
              class="prep-icon cursor-pointer list-none [&::-webkit-details-marker]:hidden"
              :aria-label="`${t('ui.more')}: ${subject.title}`"
            >
              <MoreHorizontal class="size-4" aria-hidden="true" />
            </summary>
            <div
              ref="panel"
              popover="manual"
              :style="panelStyle"
              class="fixed inset-auto z-[10000] m-0 grid w-60 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/15 dark:bg-neutral-950"
              @click="close()"
            >
              <NuxtLink
                :to="linkTo(`/prephub/${subject.id}`)"
                class="prep-menu-item"
                ><ArrowRight class="size-4" aria-hidden="true" />{{
                  t("prephub.workspace")
                }}</NuxtLink
              ><NuxtLink
                :to="linkTo(`/prephub/${subject.id}/review`)"
                class="prep-menu-item"
                ><ClipboardCheck class="size-4" aria-hidden="true" />{{
                  t("prephub.review")
                }}</NuxtLink
              ><button
                type="button"
                class="prep-menu-item"
                :disabled="busy"
                @click="addTask"
              >
                <Plus class="size-4" aria-hidden="true" />{{
                  t("prephub.dashboard.addTask")
                }}
              </button>
            </div>
          </details>
        </header>
        <p
          v-if="subject.description"
          class="line-clamp-2 break-words text-sm text-slate-600 dark:text-white/65"
        >
          {{ subject.description }}
        </p>
        <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          <p v-if="subject.eventAt" class="inline-flex items-center gap-1.5">
            <CalendarDays class="size-4 shrink-0" aria-hidden="true" /><time
              :datetime="subject.eventAt"
              >{{ date(subject.eventAt) }}</time
            >
          </p>
          <p v-if="subject.deadlineAt" class="inline-flex items-center gap-1.5">
            <Clock class="size-4 shrink-0" aria-hidden="true" /><span
              >{{ t("prephub.sharedDeadline") }}:
              <time :datetime="subject.deadlineAt">{{
                date(subject.deadlineAt)
              }}</time></span
            >
          </p>
          <p v-if="!subject.eventAt && !subject.deadlineAt">
            {{ t("prephub.noSchedule") }}
          </p>
          <p
            v-if="subject.eventAt || subject.deadlineAt"
            class="inline-flex min-w-0 items-center gap-1.5"
          >
            <Globe2 class="size-4 shrink-0" aria-hidden="true" /><span
              >{{ t("prephub.visual.timeZone") }}: {{ timeZone }}</span
            >
          </p>
        </div>
        <div class="prep-subject-progress">
          <div class="min-w-0 flex-1">
            <p
              v-if="subject.progress.total"
              class="flex items-center gap-2 text-sm"
            >
              <ListChecks
                class="size-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />{{
                t("prephub.notebook.progress", {
                  completed: subject.progress.completed,
                  total: subject.progress.total,
                })
              }}
            </p>
            <p v-else class="flex items-center gap-2 text-sm text-slate-500">
              <ListChecks class="size-4 shrink-0" aria-hidden="true" />{{
                t(
                  subject.taskCount === 0
                    ? "prephub.notebook.noTasksProgress"
                    : subject.taskCount
                      ? "prephub.visual.optionalTasksOnly"
                      : "prephub.dashboard.noTrackedTasks",
                )
              }}
            </p>
            <progress
              v-if="subject.progress.total"
              class="mt-2 block h-2 w-full accent-sky-700"
              :value="subject.progress.completed"
              :max="subject.progress.total"
              :aria-label="t('prephub.notebook.preparation')"
            />
          </div>
          <button
            type="button"
            class="prep-button shrink-0"
            :disabled="busy"
            @click="addTask"
          >
            <Plus class="size-4" aria-hidden="true" />{{
              t("prephub.dashboard.addTask")
            }}
          </button>
        </div>
        <footer
          class="flex items-center justify-between gap-3 text-xs text-slate-400"
        >
          <span
            >{{ t("prephub.updated") }}
            <time :datetime="subject.updatedAt">{{
              date(subject.updatedAt)
            }}</time></span
          ><NuxtLink
            :to="linkTo(`/prephub/${subject.id}`)"
            class="prep-icon bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
            :aria-label="`${t('prephub.dashboard.openSubject')}: ${subject.title}`"
            ><ArrowRight class="size-5" aria-hidden="true"
          /></NuxtLink>
        </footer>
      </div>
    </div>
  </article>
</template>
