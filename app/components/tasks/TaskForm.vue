<script setup lang="ts">
import {
  TASK_STATUSES,
  instantToInput,
  inputToInstant,
  isTaskDone,
  type TaskRecord,
  type TaskCatalog,
} from "~/lib/work-tasks";
const props = defineProps<{
  task?: TaskRecord;
  logDone?: boolean;
  catalog: TaskCatalog;
  busy: boolean;
  submit: (body: Record<string, unknown>) => Promise<boolean>;
}>();
const emit = defineEmits<{ cancel: [] }>();
const { t } = useAppI18n();
const source = props.task;
const form = reactive({
  title: source?.title ?? "",
  description: source?.description ?? "",
  status: props.logDone ? "DONE" : (source?.status ?? "INBOX"),
  priority: source?.priority ?? "NORMAL",
  category: source?.category ?? "General",
  projectId: source?.projectId ?? "",
  objectiveIds: source?.objectives.map((o) => o.objective.id) ?? [],
  startAt: instantToInput(source?.startAt ?? null, props.catalog.timeZone),
  dueAt: instantToInput(source?.dueAt ?? null, props.catalog.timeZone),
  completedAt: instantToInput(
    source?.completedAt ?? (props.logDone ? new Date().toISOString() : null),
    props.catalog.timeZone,
  ),
  estimatedMinutes: source?.estimatedMinutes ?? "",
  actualMinutes: source?.actualMinutes ?? "",
  notes: source?.notes ?? "",
  tags: source?.tags.join(", ") ?? "",
  evidence: source?.evidence.join("\n") ?? "",
  summary: source?.summary ?? "",
  contribution: source?.contribution ?? "",
  impact: source?.impact ?? "",
  skills: source?.skills ?? "",
  highlighted: source?.highlighted ?? false,
});
const error = ref("");
const done = computed(
  () =>
    form.status === "DONE" ||
    (form.status === "ARCHIVED" && source?.previousStatus === "DONE"),
);
async function save() {
  error.value = "";
  try {
    const { tags, evidence, estimatedMinutes, actualMinutes, ...rest } = form;
    await props.submit({
      ...rest,
      projectId: form.projectId || null,
      startAt: inputToInstant(form.startAt, props.catalog.timeZone),
      dueAt: inputToInstant(form.dueAt, props.catalog.timeZone),
      ...(done.value
        ? {
            completedAt: form.completedAt
              ? inputToInstant(form.completedAt, props.catalog.timeZone)
              : new Date().toISOString(),
          }
        : { completedAt: undefined }),
      estimatedMinutes:
        estimatedMinutes === "" ? null : Number(estimatedMinutes),
      actualMinutes: actualMinutes === "" ? null : Number(actualMinutes),
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      evidence: evidence
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <form class="space-y-4" @submit.prevent="save">
    <fieldset class="min-w-0 space-y-4" :disabled="busy">
      <label class="task-label"
        >{{ t("tasks.title")
        }}<input
          v-model="form.title"
          class="task-input"
          required
          maxlength="200"
          autofocus /></label
      ><label class="task-label"
        >{{ t("tasks.description")
        }}<textarea
          v-model="form.description"
          class="task-input"
          maxlength="4000"
          rows="3"
        />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label v-if="!logDone" class="task-label"
          >{{ t("tasks.status")
          }}<select v-model="form.status" class="task-input">
            <option v-for="s in TASK_STATUSES" :key="s" :value="s">
              {{ t(`tasks.${s}`) }}
            </option>
          </select></label
        ><label class="task-label"
          >{{ t("tasks.priority")
          }}<select v-model="form.priority" class="task-input">
            <option
              v-for="s in ['LOW', 'NORMAL', 'HIGH', 'URGENT']"
              :key="s"
              :value="s"
            >
              {{ t(`tasks.${s}`) }}
            </option>
          </select></label
        ><label class="task-label"
          >{{ t("tasks.category")
          }}<input
            v-model="form.category"
            class="task-input"
            maxlength="80"
            list="task-categories" /><datalist id="task-categories">
            <option
              v-for="c in [
                'General',
                'Bug Fix',
                'Development',
                'Research',
                'DevOps',
                'Meeting',
                'Learning',
                'Personal',
              ]"
              :key="c"
              :value="c"
            /></datalist></label
        ><label class="task-label"
          >{{ t("tasks.project")
          }}<select v-model="form.projectId" class="task-input">
            <option value="">{{ t("tasks.noProject") }}</option>
            <option v-for="p in catalog.projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        >
      </div>
      <fieldset
        v-if="catalog.objectives.length"
        class="rounded-xl border border-slate-200 p-3 dark:border-white/15"
      >
        <legend class="px-1 text-sm font-medium">
          {{ t("tasks.objective") }}
        </legend>
        <div class="max-h-44 overflow-y-auto">
          <label
            v-for="o in catalog.objectives"
            :key="o.id"
            class="flex min-h-11 items-center gap-2 text-sm"
            ><input
              v-model="form.objectiveIds"
              type="checkbox"
              :value="o.id"
            />{{ o.title }}</label
          >
        </div>
      </fieldset>
      <p class="text-xs text-slate-500">
        {{ t("tasks.timezone", { zone: catalog.timeZone }) }}
      </p>
      <label v-if="done" class="task-label"
        >{{ t("tasks.completedAt")
        }}<input
          v-model="form.completedAt"
          type="datetime-local"
          class="task-input"
          :required="logDone"
      /></label>
      <div v-if="!logDone" class="grid gap-3 sm:grid-cols-2">
        <label class="task-label"
          >{{ t("tasks.startAt")
          }}<input
            v-model="form.startAt"
            type="datetime-local"
            class="task-input" /></label
        ><label class="task-label"
          >{{ t("tasks.dueAt")
          }}<input
            v-model="form.dueAt"
            type="datetime-local"
            class="task-input"
        /></label>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label class="task-label"
          >{{ t("tasks.estimatedMinutes")
          }}<input
            v-model="form.estimatedMinutes"
            type="number"
            min="0"
            max="1000000"
            step="1"
            class="task-input" /></label
        ><label class="task-label"
          >{{ t("tasks.actualMinutes")
          }}<input
            v-model="form.actualMinutes"
            type="number"
            min="0"
            max="1000000"
            step="1"
            class="task-input"
        /></label>
      </div>
      <details
        :open="Boolean(logDone || (task && isTaskDone(task)))"
        class="rounded-xl border border-slate-200 p-3 dark:border-white/15"
      >
        <summary class="min-h-11 cursor-pointer font-semibold">
          {{ t("tasks.achievements") }}
        </summary>
        <div class="space-y-3">
          <label
            v-for="key in [
              'summary',
              'contribution',
              'impact',
              'skills',
            ] as const"
            :key="key"
            class="task-label"
            >{{ t(`tasks.${key}`)
            }}<textarea
              v-model="form[key]"
              class="task-input"
              :maxlength="key === 'skills' ? 1000 : 2000"
              rows="2"
            /></label
          ><label class="task-label"
            >{{ t("tasks.evidence")
            }}<textarea
              v-model="form.evidence"
              class="task-input"
              rows="3"
              maxlength="20480"
            /></label
          ><label class="flex min-h-11 items-center gap-2 text-sm"
            ><input v-model="form.highlighted" type="checkbox" />{{
              t("tasks.highlighted")
            }}</label
          >
        </div>
      </details>
      <label class="task-label"
        >{{ t("tasks.tags")
        }}<input
          v-model="form.tags"
          class="task-input"
          maxlength="800" /></label
      ><label class="task-label"
        >{{ t("tasks.notes")
        }}<textarea
          v-model="form.notes"
          class="task-input"
          maxlength="4000"
          rows="3"
        />
      </label>
    </fieldset>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="task-button"
        :disabled="busy"
        @click="emit('cancel')"
      >
        {{ t("tasks.cancel") }}</button
      ><button class="task-primary" :disabled="busy || !form.title.trim()">
        {{ t(busy ? "tasks.saving" : "tasks.save") }}
      </button>
    </div>
  </form>
</template>
