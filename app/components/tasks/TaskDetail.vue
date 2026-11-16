<script setup lang="ts">
import { X, Star, Check, ExternalLink, Trash2 } from "lucide-vue-next";
import {
  isTaskDone,
  safeExternalUrl,
  type TaskRecord,
  type TaskCatalog,
  type TaskMutate,
  type TaskRequest,
  type TaskAttachment,
} from "~/lib/work-tasks";
import TaskForm from "./TaskForm.vue";
import TaskFollowUps from "./TaskFollowUps.vue";
const props = defineProps<{
  task: TaskRecord;
  catalog: TaskCatalog;
  busy: boolean;
  mutate: TaskMutate;
  request: TaskRequest;
  confirm: (action: () => Promise<boolean>) => void;
}>();
const emit = defineEmits<{ changed: []; close: []; open: [id: string] }>();
const { t } = useAppI18n();
const editing = ref(false),
  subtask = ref(""),
  fileError = ref(""),
  events = ref<
    {
      id: string;
      type: string;
      completedAt: string | null;
      createdAt: string;
    }[]
  >([]),
  historyPage = ref(1),
  historyOpen = ref(false),
  rename = ref<TaskAttachment | null>(null),
  renameTitle = ref("");
function date(v: string | null) {
  return v
    ? new Intl.DateTimeFormat(undefined, {
        timeZone: props.catalog.timeZone,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(v))
    : t("tasks.noDate");
}
async function change(body: Record<string, unknown>) {
  const ok = await props.mutate(`/records/${props.task.id}`, "PATCH", body);
  if (ok) emit("changed");
  return Boolean(ok);
}
async function save(body: Record<string, unknown>) {
  const ok = await change(body);
  if (ok) editing.value = false;
  return ok;
}
async function addSubtask() {
  if (
    await props.mutate(`/records/${props.task.id}/subtasks`, "POST", {
      title: subtask.value,
    })
  ) {
    subtask.value = "";
    emit("changed");
  }
}
async function upload(event: Event) {
  fileError.value = "";
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024 || !file.size) {
    fileError.value = t("tasks.fileHint");
    return;
  }
  const data = new FormData();
  data.append("file", file);
  if (await props.mutate(`/records/${props.task.id}/attachments`, "POST", data))
    emit("changed");
  input.value = "";
}
async function history(page = 1) {
  try {
    events.value = await props.request(`/records/${props.task.id}/events`, {
      query: { page },
    });
    historyPage.value = page;
    historyOpen.value = true;
  } catch (e) {
    fileError.value = (e as Error).message;
  }
}
async function renameFile() {
  if (
    rename.value &&
    (await props.mutate(`/attachments/${rename.value.id}`, "PATCH", {
      title: renameTitle.value,
    }))
  ) {
    rename.value = null;
    emit("changed");
  }
}
async function remove() {
  if (await props.mutate(`/records/${props.task.id}`, "DELETE")) {
    emit("close");
    emit("changed");
    return true;
  }
  return false;
}
watch(
  () => props.task.id,
  () => {
    editing.value = false;
    events.value = [];
    historyOpen.value = false;
    rename.value = null;
  },
);
</script>
<template>
  <aside class="task-panel space-y-4" :aria-label="task.title">
    <header class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs text-slate-500">
          {{ t(`tasks.${task.status}`) }} · {{ task.category }} ·
          {{ t(`tasks.${task.priority}`) }}
        </p>
        <h2 class="mt-1 break-words text-lg font-bold">{{ task.title }}</h2>
      </div>
      <button
        type="button"
        class="task-icon"
        :aria-label="t('tasks.close')"
        @click="emit('close')"
      >
        <X class="size-5" aria-hidden="true" />
      </button>
    </header>
    <TaskForm
      v-if="editing"
      :task="task"
      :catalog="catalog"
      :busy="busy"
      :submit="save"
      @cancel="editing = false"
    /><template v-else
      ><div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="task-primary"
          :disabled="busy"
          @click="change({ status: isTaskDone(task) ? 'PLANNED' : 'DONE' })"
        >
          <Check class="size-4" aria-hidden="true" />{{
            t(isTaskDone(task) ? "tasks.reopen" : "tasks.complete")
          }}</button
        ><button
          type="button"
          class="task-button"
          :disabled="busy"
          @click="editing = true"
        >
          {{ t("tasks.edit") }}</button
        ><button
          type="button"
          class="task-icon"
          :aria-label="t('tasks.highlighted')"
          :aria-pressed="task.highlighted"
          :disabled="busy"
          @click="change({ highlighted: !task.highlighted })"
        >
          <Star
            class="size-5"
            :class="{ 'fill-amber-400 text-amber-500': task.highlighted }"
            aria-hidden="true"
          />
        </button>
      </div>
      <p
        v-if="task.description"
        class="whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-white/70"
      >
        {{ task.description }}
      </p>
      <dl class="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt class="text-slate-500">{{ t("tasks.project") }}</dt>
          <dd>{{ task.project?.name || t("tasks.noProject") }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">{{ t("tasks.dueAt") }}</dt>
          <dd>{{ date(task.dueAt) }}</dd>
        </div>
        <div v-if="task.completedAt">
          <dt class="text-slate-500">{{ t("tasks.completedAt") }}</dt>
          <dd>{{ date(task.completedAt) }}</dd>
        </div>
        <div>
          <dt class="text-slate-500">{{ t("tasks.timeComparison") }}</dt>
          <dd>
            {{ task.estimatedMinutes ?? "—" }} / {{ task.actualMinutes ?? "—" }}
          </dd>
        </div>
      </dl>
      <p
        v-if="task.objectives.length"
        class="break-words text-xs text-sky-700 dark:text-sky-300"
      >
        {{ task.objectives.map((o) => o.objective.title).join(" · ") }}
      </p>
      <div
        v-for="key in [
          'summary',
          'contribution',
          'impact',
          'skills',
          'notes',
        ] as const"
        v-show="task[key]"
        :key="key"
      >
        <h3 class="text-xs font-semibold text-slate-500">
          {{ t(`tasks.${key}`) }}
        </h3>
        <p class="mt-1 whitespace-pre-wrap break-words text-sm">
          {{ task[key] }}
        </p>
      </div>
      <ul>
        <li v-for="url in task.evidence" :key="url">
          <a
            v-if="safeExternalUrl(url)"
            :href="safeExternalUrl(url)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-2 break-all text-sm text-sky-700 underline dark:text-sky-300"
            ><ExternalLink class="size-4 shrink-0" aria-hidden="true" />{{
              url
            }}</a
          >
        </li>
      </ul>
      <p v-if="task.tags.length" class="break-words text-xs text-slate-500">
        {{ task.tags.map((s) => "#" + s).join(" ") }}
      </p>
      <section>
        <h3 class="font-semibold">{{ t("tasks.subtasks") }}</h3>
        <ul>
          <li
            v-for="s in task.subtasks"
            :key="s.id"
            class="flex min-h-11 items-center gap-2"
          >
            <input
              type="checkbox"
              :checked="Boolean(s.completedAt)"
              :aria-label="s.title"
              :disabled="busy"
              @change="
                async () => {
                  if (
                    await mutate(
                      `/records/${task.id}/subtasks/${s.id}`,
                      'PATCH',
                      { isCompleted: !s.completedAt },
                    )
                  )
                    emit('changed');
                }
              "
            /><input
              :value="s.title"
              class="task-input flex-1"
              maxlength="300"
              :aria-label="t('tasks.title')"
              :disabled="busy"
              @change="
                async (event) => {
                  if (
                    await mutate(
                      `/records/${task.id}/subtasks/${s.id}`,
                      'PATCH',
                      { title: (event.target as HTMLInputElement).value },
                    )
                  )
                    emit('changed');
                }
              "
            /><button
              type="button"
              class="task-icon"
              :aria-label="t('tasks.delete')"
              :disabled="busy"
              @click="
                confirm(async () => {
                  const ok = Boolean(
                    await mutate(
                      `/records/${task.id}/subtasks/${s.id}`,
                      'DELETE',
                    ),
                  );
                  if (ok) emit('changed');
                  return ok;
                })
              "
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <form class="mt-2 flex gap-2" @submit.prevent="addSubtask">
          <input
            v-model="subtask"
            class="task-input flex-1"
            :aria-label="t('tasks.subtasks')"
            required
            maxlength="300"
          /><button class="task-button" :disabled="busy || !subtask.trim()">
            {{ t("tasks.add") }}
          </button>
        </form>
      </section>
      <TaskFollowUps
        :items="task.followUps"
        :task-id="task.id"
        :time-zone="catalog.timeZone"
        :busy="busy"
        :mutate="mutate"
        :request="request"
        :confirm="confirm"
        @changed="emit('changed')"
      />
      <section>
        <h3 class="font-semibold">{{ t("tasks.files") }}</h3>
        <ul class="space-y-2">
          <li
            v-for="f in task.attachments"
            :key="f.id"
            class="flex flex-wrap items-center gap-2"
          >
            <span class="min-w-0 flex-1 break-words text-sm"
              >{{ f.title }} · {{ (f.fileSize / 1024).toFixed(1) }} KiB</span
            ><a :href="`/api/tasks/attachments/${f.id}`" class="task-button">{{
              t("tasks.download")
            }}</a
            ><a
              v-if="
                [
                  'application/pdf',
                  'image/png',
                  'image/jpeg',
                  'image/webp',
                ].includes(f.mimeType)
              "
              :href="`/api/tasks/attachments/${f.id}?preview=1`"
              target="_blank"
              rel="noopener noreferrer"
              class="task-button"
              >{{ t("prephub.preview") }}</a
            ><button
              type="button"
              class="task-button"
              :disabled="busy"
              @click="
                rename = f;
                renameTitle = f.title;
              "
            >
              {{ t("tasks.rename") }}</button
            ><button
              type="button"
              class="task-icon"
              :disabled="busy"
              :aria-label="t('tasks.delete')"
              @click="
                confirm(async () => {
                  const ok = Boolean(
                    await mutate(`/attachments/${f.id}`, 'DELETE'),
                  );
                  if (ok) emit('changed');
                  return ok;
                })
              "
            >
              <Trash2 class="size-4" aria-hidden="true" />
            </button>
          </li>
        </ul>
        <form
          v-if="rename"
          class="mt-2 flex flex-wrap gap-2"
          @submit.prevent="renameFile"
        >
          <input
            v-model="renameTitle"
            class="task-input"
            :aria-label="t('tasks.rename')"
            maxlength="200"
            required
          /><button class="task-button" :disabled="busy || !renameTitle.trim()">
            {{ t("tasks.save") }}</button
          ><button type="button" class="task-button" @click="rename = null">
            {{ t("tasks.cancel") }}
          </button>
        </form>
        <label class="task-label mt-3"
          >{{ t("tasks.files")
          }}<input
            type="file"
            class="task-input"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.pptx,.xlsx,.txt"
            :disabled="busy"
            @change="upload"
        /></label>
        <p class="mt-1 text-xs text-slate-500">{{ t("tasks.fileHint") }}</p>
      </section>
      <p v-if="fileError" role="alert" class="text-sm text-red-600">
        {{ fileError }}
      </p>
      <div
        class="flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-white/10"
      >
        <button
          type="button"
          class="task-button"
          :disabled="busy"
          @click="
            async () => {
              const result = await mutate<TaskRecord>(
                `/records/${task.id}/duplicate`,
                'POST',
              );
              if (result) {
                emit('changed');
                emit('open', result.id);
              }
            }
          "
        >
          {{ t("tasks.duplicate") }}</button
        ><button
          v-if="task.status === 'ARCHIVED'"
          type="button"
          class="task-button"
          :disabled="busy"
          @click="
            async () => {
              if (await mutate(`/records/${task.id}/restore`, 'POST'))
                emit('changed');
            }
          "
        >
          {{ t("tasks.restore") }}</button
        ><button
          v-else
          type="button"
          class="task-button"
          :disabled="busy"
          @click="change({ status: 'ARCHIVED' })"
        >
          {{ t("tasks.archiveAction") }}</button
        ><button
          type="button"
          class="task-button text-red-600"
          :disabled="busy"
          @click="confirm(remove)"
        >
          {{ t("tasks.delete") }}
        </button>
      </div>
      <section>
        <button type="button" class="task-button" @click="history()">
          {{ t("tasks.history") }}
        </button>
        <ol v-if="historyOpen" class="mt-3 space-y-2 text-xs">
          <li v-for="e in events" :key="e.id">
            {{ t(`tasks.${e.type}`) }} ·
            {{ date(e.completedAt || e.createdAt) }}
          </li>
        </ol>
        <div v-if="historyOpen" class="mt-2 flex gap-2">
          <button
            type="button"
            class="task-button"
            :disabled="historyPage === 1"
            @click="history(historyPage - 1)"
          >
            {{ t("tasks.previous") }}</button
          ><button
            type="button"
            class="task-button"
            :disabled="events.length < 50"
            @click="history(historyPage + 1)"
          >
            {{ t("tasks.next") }}
          </button>
        </div>
      </section></template
    >
  </aside>
</template>
