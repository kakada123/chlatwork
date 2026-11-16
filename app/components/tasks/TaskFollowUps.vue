<script setup lang="ts">
import {
  instantToInput,
  preservedInstant,
  type TaskRecord,
  type TaskFollowUp,
  type TaskPage,
  type TaskMutate,
  type TaskRequest,
} from "~/lib/work-tasks";
const props = defineProps<{
  items: TaskFollowUp[];
  timeZone: string;
  busy: boolean;
  mutate: TaskMutate;
  request: TaskRequest;
  confirm: (action: () => Promise<boolean>) => void;
  taskId?: string;
}>();
const emit = defineEmits<{ changed: []; open: [id: string] }>();
const { t } = useAppI18n();
const editing = ref<string | null | undefined>(undefined),
  search = ref(""),
  choices = ref<TaskRecord[]>([]),
  error = ref(""),
  taskId = ref(props.taskId ?? "");
const original = ref<TaskFollowUp | null>(null);
const form = reactive({
  followUpAt: "",
  note: "",
  nextAction: "",
  remindAt: "",
});
let searchVersion = 0;
async function findTasks() {
  const version = ++searchVersion;
  try {
    const data = await props.request<TaskPage<TaskRecord>>("/records", {
      query: { q: search.value, scope: "ALL", limit: 50 },
    });
    if (version === searchVersion) choices.value = data.items;
  } catch (e) {
    error.value = (e as Error).message;
  }
}
function edit(f?: TaskFollowUp) {
  original.value = f ?? null;
  editing.value = f?.id ?? null;
  taskId.value = props.taskId ?? f?.taskId ?? "";
  Object.assign(form, {
    followUpAt: instantToInput(f?.followUpAt ?? null, props.timeZone),
    note: f?.note ?? "",
    nextAction: f?.nextAction ?? "",
    remindAt: instantToInput(f?.remindAt ?? null, props.timeZone),
  });
  if (!props.taskId) void findTasks();
}
async function save() {
  error.value = "";
  try {
    const body = {
      ...form,
      followUpAt: preservedInstant(
        form.followUpAt,
        props.timeZone,
        original.value?.followUpAt,
      ),
      remindAt: preservedInstant(
        form.remindAt,
        props.timeZone,
        original.value?.remindAt,
      ),
    };
    if (
      await props.mutate(
        editing.value
          ? `/follow-ups/${editing.value}`
          : `/records/${taskId.value}/follow-ups`,
        editing.value ? "PATCH" : "POST",
        body,
      )
    ) {
      editing.value = undefined;
      emit("changed");
    }
  } catch (e) {
    error.value = (e as Error).message;
  }
}
async function resolve(f: TaskFollowUp) {
  if (
    await props.mutate(`/follow-ups/${f.id}`, "PATCH", {
      resolved: !f.resolvedAt,
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
  <section class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="font-semibold">{{ t("tasks.follow-ups") }}</h2>
      <button
        type="button"
        class="task-button"
        :disabled="busy"
        @click="edit()"
      >
        {{ t("tasks.add") }}
      </button>
    </div>
    <p class="text-xs text-slate-500">{{ t("tasks.reminderHint") }}</p>
    <form
      v-if="editing !== undefined"
      class="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-white/15"
      @submit.prevent="save"
    >
      <template v-if="!props.taskId && !editing"
        ><label class="task-label"
          >{{ t("tasks.search")
          }}<input
            v-model="search"
            type="search"
            class="task-input"
            maxlength="200"
            @input="findTasks" /></label
        ><label class="task-label"
          >{{ t("tasks.tasks")
          }}<ModernSelect v-model="taskId" class="mt-1 w-full" required>
            <option value="" disabled>{{ t("tasks.tasks") }}</option>
            <option v-for="task in choices" :key="task.id" :value="task.id">
              {{ task.title }}
            </option>
          </ModernSelect></label
        ></template
      ><label class="task-label"
        >{{ t("tasks.followUpAt")
        }}<ModernDateInput
          v-model="form.followUpAt"
          type="datetime-local"
          class="mt-1 w-full"
          required /></label
      ><label class="task-label"
        >{{ t("tasks.notes")
        }}<textarea
          v-model="form.note"
          class="task-input"
          maxlength="2000"
          rows="2"
        /></label
      ><label class="task-label"
        >{{ t("tasks.nextAction")
        }}<input
          v-model="form.nextAction"
          class="task-input"
          maxlength="1000" /></label
      ><label class="task-label"
        >{{ t("tasks.remindAt")
        }}<ModernDateInput
          v-model="form.remindAt"
          type="datetime-local"
          class="mt-1 w-full"
      /></label>
      <p class="text-xs text-slate-500">{{ timeZone }}</p>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex gap-2">
        <button class="task-primary" :disabled="busy">
          {{ t("tasks.save") }}</button
        ><button
          type="button"
          class="task-button"
          :disabled="busy"
          @click="editing = undefined"
        >
          {{ t("tasks.cancel") }}
        </button>
      </div>
    </form>
    <ul class="divide-y divide-slate-100 dark:divide-white/10">
      <li v-for="f in items" :key="f.id" class="space-y-2 py-3">
        <button
          v-if="f.task"
          type="button"
          class="min-h-11 break-words text-left text-sm font-semibold text-sky-700 dark:text-sky-300"
          @click="emit('open', f.taskId)"
        >
          {{ f.task.title }} · {{ t(`tasks.${f.task.status}`) }}
        </button>
        <p
          class="text-sm"
          :class="
            !f.resolvedAt && new Date(f.followUpAt).getTime() < Date.now()
              ? 'text-red-600 dark:text-red-300'
              : 'text-slate-500'
          "
        >
          {{ date(f.followUpAt) }} ·
          {{ t(f.resolvedAt ? "tasks.resolved" : "tasks.open") }}
        </p>
        <p v-if="f.note" class="whitespace-pre-wrap break-words text-sm">
          {{ f.note }}
        </p>
        <p v-if="f.nextAction" class="whitespace-pre-wrap break-words text-sm">
          <strong>{{ t("tasks.nextAction") }}:</strong> {{ f.nextAction }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="task-button"
            :disabled="busy"
            @click="resolve(f)"
          >
            {{ t(f.resolvedAt ? "tasks.reopen" : "tasks.resolve") }}</button
          ><button
            type="button"
            class="task-button"
            :disabled="busy"
            @click="edit(f)"
          >
            {{ t("tasks.snooze") }}</button
          ><button
            type="button"
            class="task-button text-red-600"
            :disabled="busy"
            @click="
              confirm(async () => {
                const ok = Boolean(
                  await mutate(`/follow-ups/${f.id}`, 'DELETE'),
                );
                if (ok) emit('changed');
                return ok;
              })
            "
          >
            {{ t("tasks.delete") }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>
