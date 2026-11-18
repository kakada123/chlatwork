<script setup lang="ts">
import {
  evaluationPeriod,
  safeExternalUrl,
  type TaskCatalog,
  type TaskReport,
  type TaskReportDraft,
  type TaskMutate,
  type TaskRequest,
} from "~/lib/work-tasks";
import {
  reportCsv,
  reportXlsx,
  reportPdf,
  downloadReport,
} from "~/lib/tasks-report-export";
import type { SiteAppearance } from "~/lib/site-appearance";
const { data: appearance } = useNuxtData<SiteAppearance>("site-appearance");
const props = defineProps<{
  catalog: TaskCatalog;
  busy: boolean;
  mutate: TaskMutate;
  request: TaskRequest;
  confirm: (action: () => Promise<boolean>) => void;
}>();
const { t } = useAppI18n();
const initial = evaluationPeriod("month", props.catalog.timeZone),
  form = reactive<TaskReportDraft>({
    title: "MBO Report",
    employeeName: "",
    from: initial.from,
    to: initial.to,
    summary: "",
    challenges: "",
    lessons: "",
    priorities: "",
    projectId: null,
    objectiveId: null,
    category: "",
    status: "ALL",
  }),
  report = ref<TaskReport | null>(null),
  saved = ref<
    {
      id: string;
      title: string;
      employeeName: string;
      periodStart: string;
      periodEnd: string;
      summary: string;
      challenges: string;
      lessons: string;
      priorities: string;
      filters: Record<string, string | null>;
    }[]
  >([]),
  reportId = ref(""),
  exporting = ref(false),
  error = ref(""),
  previewElement = ref<HTMLElement>();
let generation = 0;
watch(
  form,
  () => {
    report.value = null;
    generation++;
  },
  { deep: true, flush: "sync" },
);
async function load() {
  try {
    saved.value = await props.request("/reports");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
onMounted(load);
function period(mode: string) {
  Object.assign(form, evaluationPeriod(mode, props.catalog.timeZone));
}
function edit(item: (typeof saved.value)[number]) {
  reportId.value = item.id;
  Object.assign(form, {
    title: item.title,
    employeeName: item.employeeName,
    from: item.periodStart.slice(0, 10),
    to: item.periodEnd.slice(0, 10),
    summary: item.summary,
    challenges: item.challenges,
    lessons: item.lessons,
    priorities: item.priorities,
    projectId: item.filters.projectId ?? null,
    objectiveId: item.filters.objectiveId ?? null,
    category: item.filters.category ?? "",
    status: item.filters.status ?? "ALL",
  });
  report.value = null;
}
function fresh() {
  reportId.value = "";
  Object.assign(form, {
    title: "MBO Report",
    employeeName: "",
    ...evaluationPeriod("month", props.catalog.timeZone),
    summary: "",
    challenges: "",
    lessons: "",
    priorities: "",
    projectId: null,
    objectiveId: null,
    category: "",
    status: "ALL",
  });
  report.value = null;
}
async function preview() {
  error.value = "";
  const version = generation,
    data = await props.mutate<TaskReport>("/reports/preview", "POST", {
      ...form,
    });
  if (data && version === generation) report.value = data;
}
async function save() {
  const result = await props.mutate<{ id: string }>(
    `/reports${reportId.value ? "/" + reportId.value : ""}`,
    reportId.value ? "PATCH" : "POST",
    { ...form },
  );
  if (result) {
    reportId.value = result.id;
    await load();
  }
}
async function exportFile(kind: string) {
  if (!report.value || exporting.value) return;
  exporting.value = true;
  error.value = "";
  try {
    const name = `MBO-${report.value.draft.from}-${report.value.draft.to}`;
    if (kind === "csv")
      downloadReport(
        reportCsv(report.value),
        "text/csv;charset=utf-8",
        name + ".csv",
      );
    else if (kind === "xlsx")
      downloadReport(
        reportXlsx(report.value, appearance.value?.khmerFont),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        name + ".xlsx",
      );
    else if (previewElement.value)
      await reportPdf(previewElement.value, name + ".pdf");
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    exporting.value = false;
  }
}
function date(v: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: props.catalog.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));
}
</script>
<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-xl font-bold">{{ t("tasks.reports") }}</h1>
      <button
        type="button"
        class="task-button"
        :disabled="busy || exporting"
        @click="fresh"
      >
        {{ t("tasks.newReport") }}
      </button>
    </header>
    <p class="text-sm text-slate-500">{{ t("tasks.reportHint") }}</p>
    <details v-if="saved.length" class="task-panel">
      <summary class="cursor-pointer font-semibold">
        {{ t("tasks.savedDrafts") }}
      </summary>
      <ul class="mt-3 space-y-2">
        <li
          v-for="item in saved"
          :key="item.id"
          class="flex flex-wrap items-center justify-between gap-2"
        >
          <button
            type="button"
            class="min-h-11 break-words text-left text-sm text-sky-700 dark:text-sky-300"
            :disabled="busy || exporting"
            @click="edit(item)"
          >
            {{ item.title }} · {{ item.periodStart.slice(0, 10) }} —
            {{ item.periodEnd.slice(0, 10) }}</button
          ><button
            type="button"
            class="task-button text-red-600"
            :disabled="busy || exporting"
            @click="
              confirm(async () => {
                const ok = Boolean(
                  await mutate(`/reports/${item.id}`, 'DELETE'),
                );
                if (ok) {
                  if (reportId === item.id) fresh();
                  await load();
                }
                return ok;
              })
            "
          >
            {{ t("tasks.delete") }}
          </button>
        </li>
      </ul>
    </details>
    <form class="task-panel space-y-4" @submit.prevent="preview">
      <fieldset class="space-y-4" :disabled="busy || exporting">
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="task-label"
            >{{ t("tasks.reportTitle")
            }}<input
              v-model="form.title"
              class="task-input"
              required
              maxlength="200" /></label
          ><label class="task-label"
            >{{ t("tasks.employeeName")
            }}<input
              v-model="form.employeeName"
              class="task-input"
              maxlength="160"
          /></label>
        </div>
        <div class="flex flex-wrap gap-2">
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
        <p class="text-xs text-slate-500">
          {{ t("tasks.timezone", { zone: catalog.timeZone }) }}
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="task-label"
            >{{ t("tasks.project")
            }}<ModernSelect v-model="form.projectId" class="mt-1 w-full">
              <option :value="null">{{ t("tasks.all") }}</option>
              <option v-for="p in catalog.projects" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </ModernSelect></label
          ><label class="task-label"
            >{{ t("tasks.objective")
            }}<ModernSelect v-model="form.objectiveId" class="mt-1 w-full">
              <option :value="null">{{ t("tasks.all") }}</option>
              <option v-for="o in catalog.objectives" :key="o.id" :value="o.id">
                {{ o.title }}
              </option>
            </ModernSelect></label
          ><label class="task-label"
            >{{ t("tasks.category")
            }}<input
              v-model="form.category"
              class="task-input"
              maxlength="80" /></label
          ><label class="task-label"
            >{{ t("tasks.status")
            }}<ModernSelect v-model="form.status" class="mt-1 w-full">
              <option
                v-for="s in [
                  'ALL',
                  'DONE',
                  'ARCHIVED',
                  'INBOX',
                  'PLANNED',
                  'IN_PROGRESS',
                  'BLOCKED',
                ]"
                :key="s"
                :value="s"
              >
                {{ s === "ALL" ? t("tasks.all") : t(`tasks.${s}`) }}
              </option>
            </ModernSelect></label
          >
        </div>
        <label class="task-label"
          >{{ t("tasks.executiveSummary")
          }}<textarea
            v-model="form.summary"
            class="task-input"
            maxlength="4000"
            rows="4"
          /></label
        ><label
          v-for="key in ['challenges', 'lessons', 'priorities'] as const"
          :key="key"
          class="task-label"
          >{{ t(`tasks.${key}`)
          }}<textarea
            v-model="form[key]"
            class="task-input"
            maxlength="2000"
            rows="3"
          />
        </label>
      </fieldset>
      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="task-button"
          :disabled="
            busy || exporting || !form.title.trim() || !form.from || !form.to
          "
          @click="save"
        >
          {{ t("tasks.saveDraft") }}</button
        ><button class="task-primary" :disabled="busy || exporting">
          {{ t("tasks.preview") }}
        </button>
      </div>
    </form>
    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>
    <template v-if="report"
      ><div class="flex flex-wrap gap-2">
        <button
          v-for="kind in ['pdf', 'xlsx', 'csv']"
          :key="kind"
          type="button"
          class="task-button"
          :disabled="busy || exporting"
          @click="exportFile(kind)"
        >
          {{ t(`tasks.${kind}`) }}
        </button>
        <p v-if="exporting" role="status" class="content-center text-sm">
          {{ t("tasks.exporting") }}
        </p>
      </div>
      <div
        class="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-white/15"
      >
        <article
          ref="previewElement"
          class="tasks-report"
          :aria-label="report.draft.title"
        >
          <header class="tasks-report-block">
            <p class="text-xs font-semibold text-sky-800">ChlatWork · MBO</p>
            <h1 class="text-2xl font-bold">{{ report.draft.title }}</h1>
            <p v-if="report.draft.employeeName">
              {{ report.draft.employeeName }}
            </p>
            <p>
              {{ report.draft.from }} — {{ report.draft.to }} ·
              {{ report.timeZone }}
            </p>
            <p class="text-xs">
              {{ t("tasks.project") }}:
              {{
                catalog.projects.find((p) => p.id === report!.draft.projectId)
                  ?.name || t("tasks.all")
              }}
              · {{ t("tasks.objective") }}:
              {{
                catalog.objectives.find(
                  (o) => o.id === report!.draft.objectiveId,
                )?.title || t("tasks.all")
              }}
              · {{ t("tasks.category") }}:
              {{ report.draft.category || t("tasks.all") }} ·
              {{ t("tasks.status") }}:
              {{
                report.draft.status === "ALL"
                  ? t("tasks.all")
                  : t(`tasks.${report.draft.status}`)
              }}
            </p>
          </header>
          <section class="tasks-report-block">
            <h2>1. {{ t("tasks.executiveSummary") }}</h2>
            <p>{{ report.draft.summary || "—" }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>2. {{ t("tasks.objectives") }}</h2>
            <p>{{ t("tasks.targetHint") }}</p>
          </section>
          <section
            v-for="o in report.objectives"
            :key="o.id"
            class="tasks-report-block"
          >
            <h3>{{ o.title }}</h3>
            <p>
              {{ t("tasks.period") }}: {{ o.periodStart.slice(0, 10) }} —
              {{ o.periodEnd.slice(0, 10) }}
            </p>
            <p>{{ o.description }}</p>
            <p>
              {{ t("tasks.successCriteria") }}: {{ o.successCriteria || "—" }}
            </p>
            <p>
              {{ t("tasks.status") }}: {{ t(`tasks.${o.status}`) }} ·
              {{ t("tasks.completedContributions") }}:
              {{ o.completedContributions }}
            </p>
            <p>
              {{ t("tasks.targetValue") }}: {{ o.targetValue ?? "—" }}
              {{ o.metricUnit }}
            </p>
            <p>
              {{ t("tasks.actualValue") }}:
              {{ o.verifiedAt ? o.actualValue : "—" }}
              {{ o.verifiedAt ? o.metricUnit : "" }}
            </p>
            <p v-if="o.verifiedAt">
              {{ t("tasks.verified") }} · {{ o.verificationEvidence }}
            </p>
          </section>
          <section class="tasks-report-block">
            <h2>3. {{ t("tasks.completedContributions") }}</h2>
            <p v-if="!report.contributions.length">
              {{ t("tasks.reportEmpty") }}
            </p>
          </section>
          <section
            v-for="task in report.contributions"
            :key="task.id"
            class="tasks-report-block"
          >
            <h3>{{ task.highlighted ? "★ " : "" }}{{ task.title }}</h3>
            <p class="text-xs">
              {{ date(task.completedAt) }} ·
              {{ task.projectName || t("tasks.noProject") }} ·
              {{ task.category }}
            </p>
            <p>{{ task.summary || task.description }}</p>
            <p v-if="task.contribution">
              {{ t("tasks.contribution") }}: {{ task.contribution }}
            </p>
            <p v-if="task.objectiveTitles.length">
              {{ t("tasks.objective") }}: {{ task.objectiveTitles.join(" · ") }}
            </p>
            <p v-if="task.skills">{{ t("tasks.skills") }}: {{ task.skills }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>4. {{ t("tasks.outcomes") }}</h2>
          </section>
          <section
            v-for="task in report.contributions"
            :key="'impact-' + task.id"
            class="tasks-report-block"
          >
            <h3>{{ task.title }}</h3>
            <p class="text-xs">{{ t("tasks.impact") }}</p>
            <p>{{ task.impact || t("tasks.noOutcome") }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>5. {{ t("tasks.supportingEvidence") }}</h2>
          </section>
          <section
            v-for="task in report.contributions"
            :key="'evidence-' + task.id"
            class="tasks-report-block"
          >
            <h3>{{ task.title }}</h3>
            <p v-if="!task.evidence.length">{{ t("tasks.noEvidence") }}</p>
            <p v-for="url in task.evidence" :key="url">
              <a
                v-if="safeExternalUrl(url)"
                :href="safeExternalUrl(url)"
                target="_blank"
                rel="noopener noreferrer"
                >{{ url }}</a
              ><span v-else>{{ url }}</span>
            </p>
          </section>
          <section class="tasks-report-block">
            <h2>6. {{ t("tasks.challenges") }}</h2>
            <p>{{ report.draft.challenges || "—" }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>7. {{ t("tasks.lessons") }}</h2>
            <p>{{ report.draft.lessons || "—" }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>8. {{ t("tasks.pendingFollowUps") }}</h2>
            <p v-if="!report.followUps.length">—</p>
          </section>
          <section
            v-for="f in report.followUps"
            :key="f.id"
            class="tasks-report-block"
          >
            <h3>{{ f.title }}</h3>
            <p>{{ date(f.followUpAt) }}</p>
            <p>{{ f.note }}</p>
            <p>{{ f.nextAction }}</p>
          </section>
          <section class="tasks-report-block">
            <h2>9. {{ t("tasks.priorities") }}</h2>
            <p>{{ report.draft.priorities || "—" }}</p>
          </section>
          <footer class="tasks-report-block">
            <p class="text-xs">{{ t("tasks.volumeHint") }}</p>
            <p class="text-xs">{{ date(report.generatedAt) }}</p>
          </footer>
        </article>
      </div></template
    >
  </section>
</template>
