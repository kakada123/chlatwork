<script setup lang="ts">
import { Check, Star } from "lucide-vue-next";
import {
  TASK_STATUSES,
  groupTaskRecords,
  isTaskDone,
  type TaskRecord,
  type TaskMutate,
} from "~/lib/work-tasks";
const props = defineProps<{
  items: TaskRecord[];
  timeZone: string;
  group: string;
  board: boolean;
  busy: boolean;
  mutate: TaskMutate;
}>();
const emit = defineEmits<{ open: [id: string]; changed: [] }>();
const { t } = useAppI18n();
const groups = computed(() =>
  groupTaskRecords(
    props.items,
    props.board ? "status" : props.group,
    props.timeZone,
  ),
);
async function complete(task: TaskRecord) {
  if (
    await props.mutate(`/records/${task.id}`, "PATCH", {
      status: isTaskDone(task) ? "PLANNED" : "DONE",
    })
  )
    emit("changed");
}
function date(v: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}
</script>
<template>
  <div class="gap-3" :class="board ? 'flex overflow-x-auto pb-3' : 'space-y-4'">
    <section
      v-for="[key, items] in groups"
      :key="key"
      :class="
        board
          ? 'w-72 shrink-0 rounded-2xl bg-slate-100 p-3 dark:bg-white/5'
          : 'space-y-2'
      "
    >
      <h2 v-if="key" class="mb-2 text-sm font-semibold text-slate-500">
        {{
          TASK_STATUSES.includes(key as (typeof TASK_STATUSES)[number])
            ? t(`tasks.${key}`)
            : key
        }}
        · {{ items.length }}
      </h2>
      <ul class="space-y-2">
        <li
          v-for="task in items"
          :key="task.id"
          class="task-panel flex items-start gap-2 !p-3"
        >
          <button
            type="button"
            class="task-icon"
            :aria-label="
              t(isTaskDone(task) ? 'tasks.reopen' : 'tasks.complete')
            "
            :disabled="busy"
            @click="complete(task)"
          >
            <Check
              class="size-5 rounded-full border p-0.5"
              :class="
                isTaskDone(task)
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-300 text-slate-400'
              "
              aria-hidden="true"
            /></button
          ><button
            type="button"
            class="min-h-11 min-w-0 flex-1 text-left"
            @click="emit('open', task.id)"
          >
            <span class="flex items-center gap-2"
              ><strong class="break-words text-sm">{{ task.title }}</strong
              ><Star
                v-if="task.highlighted"
                class="size-4 shrink-0 fill-amber-400 text-amber-500"
                aria-hidden="true" /></span
            ><span class="mt-1 block text-xs text-slate-500"
              >{{ t(`tasks.${task.status}`) }} · {{ task.category
              }}<span v-if="task.project">
                · {{ task.project.name }}</span
              ></span
            ><span
              v-if="task.impact"
              class="mt-2 block whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-white/70"
              >{{ task.impact }}</span
            ><span
              v-if="task.completedAt || task.dueAt"
              class="mt-1 block text-xs"
              :class="
                !isTaskDone(task) &&
                task.dueAt &&
                new Date(task.dueAt).getTime() < Date.now()
                  ? 'text-red-600 dark:text-red-300'
                  : 'text-slate-500'
              "
              >{{ date((task.completedAt || task.dueAt)!) }}</span
            >
          </button>
        </li>
      </ul>
    </section>
    <p v-if="!items.length" class="task-panel text-sm text-slate-500">
      {{ t("tasks.empty") }}
    </p>
  </div>
</template>
