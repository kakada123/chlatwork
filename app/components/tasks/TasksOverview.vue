<script setup lang="ts">
import type { TaskDashboard, TaskMutate } from "~/lib/work-tasks";
import TaskList from "./TaskList.vue";
const props = defineProps<{
  dashboard: TaskDashboard;
  busy: boolean;
  mutate: TaskMutate;
}>();
const emit = defineEmits<{
  open: [id: string];
  changed: [];
  view: [key: string];
}>();
const { t } = useAppI18n();
const stats = computed(() => [
  { key: "dueToday", value: props.dashboard.dueToday, view: "tasks" },
  {
    key: "IN_PROGRESS",
    value: props.dashboard.counts.IN_PROGRESS ?? 0,
    view: "tasks",
  },
  {
    key: "completedPeriod",
    value: props.dashboard.completed,
    view: "achievements",
  },
  { key: "overdue", value: props.dashboard.overdue, view: "tasks" },
  {
    key: "follow-ups",
    value: props.dashboard.followUps.total,
    view: "follow-ups",
  },
]);
</script>
<template>
  <section class="space-y-4">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <button
        v-for="s in stats"
        :key="s.key"
        type="button"
        class="task-panel text-left"
        @click="emit('view', s.key)"
      >
        <strong class="block text-xl">{{ s.value }}</strong
        ><span class="mt-1 block text-xs text-slate-500">{{
          t(`tasks.${s.key}`)
        }}</span>
      </button>
    </div>
    <section class="space-y-3">
      <h2 class="text-lg font-semibold">{{ t("tasks.recentWins") }}</h2>
      <TaskList
        :items="dashboard.accomplishments"
        :time-zone="dashboard.timeZone"
        group="day"
        :board="false"
        :busy="busy"
        :mutate="mutate"
        @open="emit('open', $event)"
        @changed="emit('changed')"
      />
    </section>
    <div class="grid gap-4 lg:grid-cols-2">
      <section class="task-panel space-y-3">
        <h2 class="font-semibold">{{ t("tasks.weeklyWins") }}</h2>
        <p class="text-xs text-slate-500">
          {{ dashboard.weekly.from }} — {{ dashboard.weekly.to }} ·
          {{ dashboard.weekly.total }} {{ t("tasks.DONE") }}
        </p>
        <div
          v-for="(value, day) in dashboard.weekly.byDay"
          :key="day"
          class="grid grid-cols-[6rem_minmax(0,1fr)_2rem] items-center gap-2 text-xs"
        >
          <span>{{ day }}</span
          ><span
            class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
            ><span
              class="block h-full rounded-full bg-sky-600"
              :style="{
                width: `${(100 * value) / Math.max(1, ...Object.values(dashboard.weekly.byDay))}%`,
              }" /></span
          ><span>{{ value }}</span>
        </div>
        <p class="text-xs text-slate-500">
          {{ t("tasks.objectiveProgress") }}:
          {{ dashboard.weekly.objectiveLinked }}
        </p>
        <p class="text-xs text-slate-500">
          {{ t("tasks.timeComparison") }}:
          {{ dashboard.weekly.estimatedMinutes }} /
          {{ dashboard.weekly.actualMinutes }}
        </p>
        <p class="text-xs text-slate-500">{{ t("tasks.volumeHint") }}</p>
      </section>
      <section class="task-panel space-y-3">
        <h2 class="font-semibold">{{ t("tasks.objectives") }}</h2>
        <article v-for="o in dashboard.objectives" :key="o.id">
          <h3 class="text-sm font-semibold">{{ o.title }}</h3>
          <p class="mt-1 text-xs text-slate-500">
            {{
              t("tasks.contributionCount", {
                done: o.completedContributions,
                total: o.linkedTasks,
              })
            }}
          </p>
        </article>
        <p class="text-xs text-slate-500">{{ t("tasks.targetHint") }}</p>
      </section>
      <section
        v-for="key in ['byCategory', 'byProject'] as const"
        :key="key"
        class="task-panel"
      >
        <h2 class="font-semibold">{{ t(`tasks.${key}`) }}</h2>
        <dl class="mt-3 space-y-2">
          <div
            v-for="(value, label) in dashboard.weekly[key]"
            :key="label"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <dt class="break-words">{{ label || t("tasks.noProject") }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
      </section>
    </div>
    <section class="task-panel">
      <h2 class="font-semibold">{{ t("tasks.reflection") }}</h2>
      <p class="mt-2 text-sm text-slate-500">{{ t("tasks.reflectionHint") }}</p>
      <button
        type="button"
        class="task-button mt-3"
        @click="emit('view', 'reports')"
      >
        {{ t("tasks.reports") }}
      </button>
    </section>
  </section>
</template>
