<script setup lang="ts">
import {
  evaluationPeriod,
  type TaskCatalog,
  type TaskProject,
  type TaskObjective,
  type TaskMutate,
} from "~/lib/work-tasks";
const props = defineProps<{
  kind: "projects" | "objectives";
  catalog: TaskCatalog;
  busy: boolean;
  mutate: TaskMutate;
  confirm: (action: () => Promise<boolean>) => void;
}>();
const emit = defineEmits<{
  changed: [];
  filter: [filters: Record<string, string>];
}>();
const { t } = useAppI18n();
const editing = ref<string | null | undefined>(),
  error = ref("");
const form = reactive({
  name: "",
  title: "",
  description: "",
  color: "#0369a1",
  status: "ACTIVE",
  targetDate: "",
  notes: "",
  objectiveIds: [] as string[],
  from: "",
  to: "",
  successCriteria: "",
  targetValue: "" as string | number,
  actualValue: "" as string | number,
  metricUnit: "",
  verificationEvidence: "",
  verifyResult: false,
});
function edit(record?: TaskProject | TaskObjective) {
  editing.value = record?.id ?? null;
  error.value = "";
  const p =
      props.kind === "projects"
        ? (record as TaskProject | undefined)
        : undefined,
    o =
      props.kind === "objectives"
        ? (record as TaskObjective | undefined)
        : undefined,
    period = evaluationPeriod("quarter", props.catalog.timeZone);
  Object.assign(form, {
    name: p?.name ?? "",
    title: o?.title ?? "",
    description: record?.description ?? "",
    color: p?.color ?? "#0369a1",
    status: record?.status ?? "ACTIVE",
    targetDate: p?.targetDate?.slice(0, 10) ?? "",
    notes: p?.notes ?? "",
    objectiveIds: p?.objectives.map((l) => l.objective.id) ?? [],
    from: o?.periodStart.slice(0, 10) ?? period.from,
    to: o?.periodEnd.slice(0, 10) ?? period.to,
    successCriteria: o?.successCriteria ?? "",
    targetValue: o?.targetValue ?? "",
    actualValue: o?.actualValue ?? "",
    metricUnit: o?.metricUnit ?? "",
    verificationEvidence: o?.verificationEvidence ?? "",
    verifyResult: Boolean(o?.verifiedAt),
  });
}
function period(mode: string) {
  Object.assign(form, evaluationPeriod(mode, props.catalog.timeZone));
}
async function save() {
  error.value = "";
  const body =
    props.kind === "projects"
      ? {
          name: form.name,
          description: form.description,
          color: form.color,
          status: form.status,
          targetDate: form.targetDate || null,
          notes: form.notes,
          objectiveIds: form.objectiveIds,
        }
      : {
          title: form.title,
          description: form.description,
          status: form.status,
          from: form.from,
          to: form.to,
          successCriteria: form.successCriteria,
          targetValue:
            form.targetValue === "" ? null : Number(form.targetValue),
          actualValue:
            form.actualValue === "" ? null : Number(form.actualValue),
          metricUnit: form.metricUnit,
          verificationEvidence: form.verificationEvidence,
          verifyResult: form.verifyResult,
        };
  if (
    await props.mutate(
      `/${props.kind}${editing.value ? "/" + editing.value : ""}`,
      editing.value ? "PATCH" : "POST",
      body,
    )
  ) {
    editing.value = undefined;
    emit("changed");
  }
}
watch(
  () => props.kind,
  () => (editing.value = undefined),
);
</script>
<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between gap-2">
      <h1 class="text-xl font-bold">{{ t(`tasks.${kind}`) }}</h1>
      <button
        type="button"
        class="task-primary"
        :disabled="busy"
        @click="edit()"
      >
        {{ t(kind === "projects" ? "tasks.newProject" : "tasks.newObjective") }}
      </button>
    </header>
    <form
      v-if="editing !== undefined"
      class="task-panel space-y-4"
      @submit.prevent="save"
    >
      <fieldset class="space-y-4" :disabled="busy">
        <label v-if="kind === 'projects'" class="task-label"
          >{{ t("tasks.projectName")
          }}<input
            v-model="form.name"
            class="task-input"
            required
            maxlength="160" /></label
        ><label v-else class="task-label"
          >{{ t("tasks.title")
          }}<input
            v-model="form.title"
            class="task-input"
            required
            maxlength="200" /></label
        ><label class="task-label"
          >{{ t("tasks.description")
          }}<textarea
            v-model="form.description"
            class="task-input"
            maxlength="4000"
            rows="3"
          /></label
        ><label class="task-label"
          >{{ t("tasks.status")
          }}<ModernSelect v-model="form.status" class="mt-1 w-full">
            <option
              v-for="s in kind === 'projects'
                ? ['ACTIVE', 'COMPLETED', 'ARCHIVED']
                : ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']"
              :key="s"
              :value="s"
            >
              {{ t(`tasks.${s}`) }}
            </option>
          </ModernSelect></label
        ><template v-if="kind === 'projects'"
          ><div class="grid grid-cols-2 gap-3">
            <label class="task-label"
              >{{ t("tasks.color")
              }}<input
                v-model="form.color"
                type="color"
                class="task-input" /></label
            ><label class="task-label"
              >{{ t("tasks.targetDate")
              }}<ModernDateInput
                v-model="form.targetDate"
                type="date"
                class="mt-1 w-full"
            /></label>
          </div>
          <label class="task-label"
            >{{ t("tasks.notes")
            }}<textarea
              v-model="form.notes"
              class="task-input"
              maxlength="4000"
              rows="3"
            />
          </label>
          <fieldset>
            <legend class="text-sm font-semibold">
              {{ t("tasks.objective") }}
            </legend>
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
          </fieldset></template
        ><template v-else
          ><div class="flex flex-wrap gap-2">
            <button
              v-for="mode in ['month', 'quarter']"
              :key="mode"
              type="button"
              class="task-button"
              @click="period(mode)"
            >
              {{ t(`tasks.${mode}`) }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="task-label"
              >{{ t("tasks.from")
              }}<ModernDateInput
                v-model="form.from"
                type="date"
                class="mt-1 w-full"
                required /></label
            ><label class="task-label"
              >{{ t("tasks.to")
              }}<ModernDateInput
                v-model="form.to"
                type="date"
                class="mt-1 w-full"
                required
            /></label>
          </div>
          <label class="task-label"
            >{{ t("tasks.successCriteria")
            }}<textarea
              v-model="form.successCriteria"
              class="task-input"
              maxlength="4000"
              rows="3"
            />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="task-label"
              >{{ t("tasks.targetValue")
              }}<input
                v-model="form.targetValue"
                type="number"
                step="0.0001"
                class="task-input" /></label
            ><label class="task-label"
              >{{ t("tasks.actualValue")
              }}<input
                v-model="form.actualValue"
                type="number"
                step="0.0001"
                class="task-input"
            /></label>
          </div>
          <label class="task-label"
            >{{ t("tasks.metricUnit")
            }}<input
              v-model="form.metricUnit"
              class="task-input"
              maxlength="80" /></label
          ><label class="task-label"
            >{{ t("tasks.verificationEvidence")
            }}<textarea
              v-model="form.verificationEvidence"
              class="task-input"
              maxlength="2000"
              rows="3"
            /></label
          ><label class="flex min-h-11 items-center gap-2 text-sm"
            ><input v-model="form.verifyResult" type="checkbox" />{{
              t("tasks.verifyResult")
            }}</label
          >
          <p class="text-xs text-slate-500">
            {{ t("tasks.targetHint") }}
          </p></template
        >
      </fieldset>
      <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="task-button"
          :disabled="busy"
          @click="editing = undefined"
        >
          {{ t("tasks.cancel") }}</button
        ><button class="task-primary" :disabled="busy">
          {{ t("tasks.save") }}
        </button>
      </div>
    </form>
    <div v-if="kind === 'projects'" class="grid gap-3 sm:grid-cols-2">
      <article
        v-for="p in catalog.projects"
        :key="p.id"
        class="task-panel space-y-3"
      >
        <h2 class="flex items-center gap-2 font-semibold">
          <span
            class="size-3 shrink-0 rounded-full"
            :style="{ backgroundColor: p.color }"
            aria-hidden="true"
          />{{ p.name }}
        </h2>
        <p class="text-xs text-slate-500">
          {{ t(`tasks.${p.status}`) }} · {{ p._count.tasks }}
          {{ t("tasks.tasks") }}
        </p>
        <p v-if="p.description" class="whitespace-pre-wrap break-words text-sm">
          {{ p.description }}
        </p>
        <p
          v-if="p.notes"
          class="whitespace-pre-wrap break-words text-sm text-slate-500"
        >
          {{ p.notes }}
        </p>
        <p v-if="p.targetDate" class="text-xs text-slate-500">
          {{ p.targetDate.slice(0, 10) }}
        </p>
        <p
          v-if="p.objectives.length"
          class="text-xs text-sky-700 dark:text-sky-300"
        >
          {{ p.objectives.map((l) => l.objective.title).join(" · ") }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="task-button"
            @click="emit('filter', { projectId: p.id })"
          >
            {{ t("tasks.linkedWork") }}</button
          ><button
            type="button"
            class="task-button"
            :disabled="busy"
            @click="edit(p)"
          >
            {{ t("tasks.edit") }}</button
          ><button
            type="button"
            class="task-button text-red-600"
            :disabled="busy"
            @click="
              confirm(async () => {
                const ok = Boolean(await mutate(`/projects/${p.id}`, 'DELETE'));
                if (ok) emit('changed');
                return ok;
              })
            "
          >
            {{ t("tasks.delete") }}
          </button>
        </div>
      </article>
    </div>
    <div v-else class="space-y-3">
      <article
        v-for="o in catalog.objectives"
        :key="o.id"
        class="task-panel space-y-3"
      >
        <h2 class="font-semibold">{{ o.title }}</h2>
        <p class="text-xs text-slate-500">
          {{ o.periodStart.slice(0, 10) }} — {{ o.periodEnd.slice(0, 10) }} ·
          {{ t(`tasks.${o.status}`) }}
        </p>
        <p v-if="o.description" class="whitespace-pre-wrap break-words text-sm">
          {{ o.description }}
        </p>
        <p
          v-if="o.successCriteria"
          class="whitespace-pre-wrap break-words text-sm"
        >
          <strong>{{ t("tasks.successCriteria") }}:</strong>
          {{ o.successCriteria }}
        </p>
        <p class="text-sm font-semibold">
          {{
            t("tasks.contributionCount", {
              done: o.completedContributions,
              total: o.linkedTasks,
            })
          }}
        </p>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt class="text-xs text-slate-500">{{ t("tasks.targetValue") }}</dt>
            <dd>{{ o.targetValue ?? "—" }} {{ o.metricUnit }}</dd>
          </div>
          <div>
            <dt class="text-xs text-slate-500">{{ t("tasks.actualValue") }}</dt>
            <dd>
              {{ o.verifiedAt ? o.actualValue : "—" }}
              {{ o.verifiedAt ? o.metricUnit : "" }} ·
              {{ t(o.verifiedAt ? "tasks.verified" : "tasks.unverified") }}
            </dd>
          </div>
        </dl>
        <p
          v-if="o.verifiedAt"
          class="whitespace-pre-wrap break-words text-xs text-slate-500"
        >
          {{ o.verificationEvidence }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="task-button"
            @click="emit('filter', { objectiveId: o.id })"
          >
            {{ t("tasks.linkedWork") }}</button
          ><button
            type="button"
            class="task-button"
            :disabled="busy"
            @click="edit(o)"
          >
            {{ t("tasks.edit") }}</button
          ><button
            type="button"
            class="task-button text-red-600"
            :disabled="busy"
            @click="
              confirm(async () => {
                const ok = Boolean(
                  await mutate(`/objectives/${o.id}`, 'DELETE'),
                );
                if (ok) emit('changed');
                return ok;
              })
            "
          >
            {{ t("tasks.delete") }}
          </button>
        </div>
      </article>
      <p class="text-xs text-slate-500">{{ t("tasks.targetHint") }}</p>
    </div>
  </section>
</template>
