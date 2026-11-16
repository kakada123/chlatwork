<script setup lang="ts">
import {
  ArrowLeft,
  ClipboardCheck,
  Share2,
  MoreHorizontal,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
} from "lucide-vue-next";
import {
  PREP_STATUSES,
  PREP_TYPES,
  type PrepSubject,
  type PrepDashboard,
  type PrepMutation,
  type PrepType,
  type PrepSection as SectionData,
} from "~/lib/prephub";
import PrepOverview from "./PrepOverview.vue";
import PrepNotebook from "./PrepNotebook.vue";
import PrepAddMenu from "./PrepAddMenu.vue";
import PrepShareSettings from "./PrepShareSettings.vue";
import PrepDialog from "./PrepDialog.vue";
import PrepSubjectForm from "./PrepSubjectForm.vue";
import PrepSection from "./PrepSection.vue";
import PrepCapture from "./PrepCapture.vue";
import PrepReminders from "./PrepReminders.vue";
import PrepInbox from "./PrepInbox.vue";
import "~/assets/css/prephub.css";
const props = defineProps<{ id: string; review?: boolean }>();
const { t } = useAppI18n();
const { linkTo } = useProductDomain();
const { request, owner, timeZone, error, busy, feedback, fail, date } =
  usePrepHub();
const subject = ref<PrepSubject | null>(null);
const loading = ref(true);
const shareOpen = ref(false),
  moreOpen = ref(false),
  reminderOpen = ref(false);
const sectionEditorId = ref<string | null>(null);
const activeType = ref<PrepType>("CHECKLIST"),
  captureType = ref<PrepType>("NOTES"),
  captureTarget = ref<string>();
const contextSection = ref<string>();
const contextTouched = ref(false);
const notebook = ref<{
  focusTask: (sectionId?: string) => Promise<void>;
} | null>(null);
const managedSection = computed(() =>
  subject.value?.sections.find((s) => s.id === sectionEditorId.value),
);
const edit = ref(false),
  capture = ref(false),
  addSection = ref(false);
const sectionForm = reactive({ type: "CHECKLIST", title: "" });
const statusValue = ref("DRAFT");
const pendingDelete = shallowRef<(() => Promise<boolean>) | null>(null);
const history = ref<{ id: string; action: string; createdAt: string }[]>([]);
const historyPage = ref(1),
  historyOpen = ref(false),
  historyBusy = ref(false);
const base = computed(() => `/subjects/${props.id}`);
const visibleSections = computed(() =>
  !props.review
    ? (subject.value?.sections ?? [])
    : (subject.value?.sections.filter(
        (s) =>
          s.resources.length ||
          s.items.some(
            (i) =>
              !["CHECKLIST", "DELIVERABLES"].includes(s.type) || !i.isCompleted,
          ),
      ) ?? []),
);
let loadVersion = 0;
let historyVersion = 0;
async function load(initial = false) {
  const version = ++loadVersion;
  if (initial) loading.value = true;
  error.value = "";
  try {
    const [s, settings] = await Promise.all([
      request<PrepSubject>(base.value),
      initial ? request<PrepDashboard>("/dashboard") : Promise.resolve(null),
    ]);
    if (version !== loadVersion) return;
    subject.value = s;
    statusValue.value = s.status;
    if (settings) timeZone.value = settings.timeZone;
  } catch (e) {
    if (version === loadVersion) fail(e);
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}
const mutate: PrepMutation = async (path, method, body) => {
  if (busy.value) return false;
  busy.value = true;
  error.value = "";
  feedback.value = "";
  try {
    await request(`${base.value}${path}`, {
      method,
      ...(body === undefined ? {} : { body }),
    });
    await load();
    feedback.value = t("prephub.saved");
    return true;
  } catch (e) {
    fail(e);
    return false;
  } finally {
    busy.value = false;
  }
};
function setAddContext(type: PrepType, sectionId?: string) {
  contextTouched.value = true;
  activeType.value = type;
  contextSection.value = sectionId;
}
function resolveAddContext() {
  // A deep link seeds the initial context; later notebook interactions take precedence.
  if (contextTouched.value || typeof window === "undefined") return;
  const section = subject.value?.sections.find(
    (s) => window.location.hash === `#section-${s.id}`,
  );
  if (section) setAddContext(section.type, section.id);
}
function chooseAdd(type: PrepType | "REMINDER") {
  if (type === "REMINDER") {
    reminderOpen.value = true;
    return;
  }
  if (["CHECKLIST", "DELIVERABLES"].includes(type)) {
    void notebook.value?.focusTask(contextSection.value);
    return;
  }
  captureType.value = type;
  captureTarget.value = contextSection.value;
  capture.value = true;
}
async function createTask(title: string, sectionId?: string) {
  if (busy.value || !title.trim()) return false;
  const id = props.id,
    startedOwner = owner.value;
  busy.value = true;
  error.value = "";
  feedback.value = "";
  try {
    // Reload before resolving a section so retrying a failed first item does not create another empty section.
    const latest = await request<PrepSubject>(`/subjects/${id}`);
    let section =
      latest.sections.find(
        (s) =>
          s.id === sectionId && ["CHECKLIST", "DELIVERABLES"].includes(s.type),
      ) ?? latest.sections.find((s) => s.type === "CHECKLIST");
    if (!section)
      section = await request<SectionData>(`/subjects/${id}/sections`, {
        method: "POST",
        body: { type: "CHECKLIST", title: t("prephub.notebook.checklist") },
      });
    await request(`/subjects/${id}/sections/${section.id}/items`, {
      method: "POST",
      body: { title: title.trim() },
    });
    if (props.id === id && owner.value === startedOwner) {
      await load();
      feedback.value = t("prephub.saved");
    }
    return true;
  } catch (e) {
    if (props.id === id && owner.value === startedOwner) fail(e);
    return false;
  } finally {
    busy.value = false;
  }
}
function primaryStatusAction() {
  if (!subject.value) return;
  if (subject.value.status === "ARCHIVED") return mutate("/restore", "POST");
  return mutate("", "PATCH", {
    status:
      subject.value.status === "READY"
        ? "COMPLETED"
        : subject.value.status === "COMPLETED"
          ? "PREPARING"
          : "READY",
  });
}

async function saveSubject(body: Record<string, unknown>) {
  const ok = await mutate("", "PATCH", body);
  if (ok) edit.value = false;
  return ok;
}
async function createSection() {
  if (
    await mutate("/sections", "POST", {
      ...sectionForm,
      title: sectionForm.title.trim() || t(`prephub.${sectionForm.type}`),
    })
  ) {
    addSection.value = false;
    sectionForm.title = "";
  }
}
async function moveSection(id: string, direction: number) {
  const ids = subject.value!.sections.map((s) => s.id),
    index = ids.indexOf(id),
    next = index + direction;
  if (next < 0 || next >= ids.length) return;
  [ids[index], ids[next]] = [ids[next]!, ids[index]!];
  await mutate("/sections/reorder", "PUT", { ids });
}
function confirm(action: () => Promise<boolean>) {
  pendingDelete.value = action;
}
async function confirmDelete() {
  if (await pendingDelete.value?.()) pendingDelete.value = null;
}
async function deleteSubject() {
  if (busy.value) return false;
  busy.value = true;
  try {
    await request(base.value, { method: "DELETE" });
    pendingDelete.value = null;
    await navigateTo(linkTo("/prephub"));
    return true;
  } catch (e) {
    fail(e);
    return false;
  } finally {
    busy.value = false;
  }
}
async function loadHistory(page = 1) {
  const version = ++historyVersion;
  historyBusy.value = true;
  try {
    const result = await request<
      { id: string; action: string; createdAt: string }[]
    >(`${base.value}/history`, { query: { page } });
    if (version !== historyVersion) return;
    history.value = result;
    historyPage.value = page;
    historyOpen.value = true;
  } catch (e) {
    fail(e);
  } finally {
    historyBusy.value = false;
  }
}
watch(
  () => props.id,
  () => {
    subject.value = null;
    history.value = [];
    historyVersion++;
    moreOpen.value = false;
    reminderOpen.value = false;
    sectionEditorId.value = null;
    contextSection.value = undefined;
    contextTouched.value = false;
    activeType.value = "CHECKLIST";
    shareOpen.value = false;
    edit.value = false;
    capture.value = false;
    addSection.value = false;
    pendingDelete.value = null;
    void load(true);
  },
);
watch(owner, () => {
  loadVersion++;
  historyVersion++;
  subject.value = null;
  history.value = [];
  pendingDelete.value = null;
  moreOpen.value = false;
  reminderOpen.value = false;
  sectionEditorId.value = null;
  contextSection.value = undefined;
  contextTouched.value = false;
  activeType.value = "CHECKLIST";
  shareOpen.value = false;
  edit.value = false;
  capture.value = false;
  addSection.value = false;
  if (owner.value) void load(true);
});
onMounted(() => load(true));
onBeforeUnmount(() => {
  loadVersion++;
  historyVersion++;
});
</script>
<template>
  <main
    class="prephub mx-auto max-w-5xl space-y-4 pb-24 text-slate-950 dark:text-white"
  >
    <nav class="flex items-center justify-between gap-2">
      <NuxtLink :to="linkTo('/prephub')" class="prep-button"
        ><ArrowLeft class="size-4" aria-hidden="true" />{{
          t("prephub.back")
        }}</NuxtLink
      >
      <div v-if="subject && owner" class="flex gap-1">
        <button type="button" class="prep-button" @click="shareOpen = true">
          <Share2 class="size-4" aria-hidden="true" />{{
            t("prephub.share")
          }}</button
        ><button type="button" class="prep-button" @click="moreOpen = true">
          <MoreHorizontal class="size-4" aria-hidden="true" />{{ t("ui.more") }}
        </button>
      </div>
    </nav>
    <PrepInbox v-if="owner" :time-zone="timeZone" />
    <p v-if="loading" role="status" class="prep-panel animate-pulse">
      {{ t("prephub.loading") }}
    </p>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ error
      }}<button
        type="button"
        class="ml-2 min-h-11 underline"
        :disabled="busy"
        @click="load(!subject)"
      >
        {{ t("prephub.retry") }}
      </button>
    </div>
    <p
      v-if="feedback"
      role="status"
      class="text-sm text-emerald-700 dark:text-emerald-300"
    >
      {{ feedback }}
    </p>
    <template v-if="subject && owner">
      <PrepOverview :subject="subject" :time-zone="timeZone" />
      <div
        class="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95"
      >
        <PrepAddMenu
          v-if="!review"
          :busy="busy"
          :default-type="activeType"
          @opening="resolveAddContext"
          @select="chooseAdd"
        />
        <NuxtLink v-else :to="linkTo(`/prephub/${id}`)" class="prep-button"
          ><ArrowLeft class="size-4" aria-hidden="true" />{{
            t("prephub.notebook.backToNotebook")
          }}</NuxtLink
        >
        <button
          type="button"
          class="prep-button"
          :disabled="busy"
          @click="primaryStatusAction"
        >
          <CheckCircle2 class="size-4 text-emerald-600" aria-hidden="true" />{{
            t(
              subject.status === "ARCHIVED"
                ? "prephub.restore"
                : subject.status === "COMPLETED"
                  ? "prephub.notebook.prepareAgain"
                  : subject.status === "READY"
                    ? "prephub.notebook.finish"
                    : "prephub.notebook.markReady",
            )
          }}
        </button>
      </div>
      <p v-if="review" class="text-sm text-slate-500">
        {{ t("prephub.notebook.reviewHelp") }}
      </p>
      <PrepNotebook
        ref="notebook"
        :sections="visibleSections"
        :subject-id="id"
        :time-zone="timeZone"
        :busy="busy"
        :error="error"
        :mutate="mutate"
        :confirm="confirm"
        :create-task="createTask"
        :review="review"
        @context="setAddContext"
      />
      <PrepDialog
        :open="shareOpen"
        :title="t('prephub.shareWorkspace')"
        @close="shareOpen = false"
        ><PrepShareSettings
          v-if="shareOpen"
          :key="subject.id"
          :subject-id="subject.id"
      /></PrepDialog>
      <PrepDialog
        :open="moreOpen"
        :error="error"
        :title="t('prephub.notebook.moreSettings')"
        @close="moreOpen = false"
      >
        <div class="space-y-4">
          <button
            type="button"
            class="prep-button w-full"
            :disabled="busy"
            @click="edit = true"
          >
            {{ t("prephub.notebook.editSubject") }}
          </button>
          <NuxtLink
            :to="linkTo(review ? `/prephub/${id}` : `/prephub/${id}/review`)"
            class="prep-button w-full"
            @click="moreOpen = false"
            ><ClipboardCheck class="size-4" aria-hidden="true" />{{
              t(review ? "prephub.workspace" : "prephub.review")
            }}</NuxtLink
          >
          <details>
            <summary
              class="min-h-11 cursor-pointer content-center font-semibold"
            >
              {{ t("prephub.status") }}
            </summary>
            <form
              class="space-y-3 pb-3"
              @submit.prevent="mutate('', 'PATCH', { status: statusValue })"
            >
              <label class="prep-label"
                >{{ t("prephub.status")
                }}<ModernSelect
                  v-model="statusValue"
                  class="mt-1 w-full"
                  :disabled="busy"
                  ><option
                    v-for="status in PREP_STATUSES.filter(
                      (s) => s !== 'ARCHIVED' || subject.status === 'ARCHIVED',
                    )"
                    :key="status"
                    :value="status"
                  >
                    {{ t(`prephub.${status}`) }}
                  </option></ModernSelect
                ></label
              ><button
                class="prep-button"
                :disabled="busy || statusValue === subject.status"
              >
                {{ t("prephub.statusUpdate") }}
              </button>
            </form>
          </details>
          <details>
            <summary
              class="min-h-11 cursor-pointer content-center font-semibold"
            >
              {{ t("prephub.reminders") }}
            </summary>
            <PrepReminders
              :subject="subject"
              :time-zone="timeZone"
              :busy="busy"
              :mutate="mutate"
              :confirm="confirm"
            />
          </details>
          <details>
            <summary
              class="min-h-11 cursor-pointer content-center font-semibold"
            >
              {{ t("prephub.notebook.advancedProgress") }}
            </summary>
            <p class="pb-3 text-xs leading-relaxed text-slate-500">
              {{ t("prephub.notebook.progressHelp") }}
              {{ t("prephub.readyHint") }}
            </p>
            <dl class="grid grid-cols-2 gap-2 text-sm">
              <div
                v-for="metric in [
                  'remaining',
                  'overdueItems',
                  'unansweredResearch',
                  'unansweredQuestions',
                  'missingDeliverables',
                ] as const"
                :key="metric"
                class="rounded-lg bg-slate-50 p-2 dark:bg-white/5"
              >
                <dt class="text-xs text-slate-500">
                  {{ t(`prephub.${metric}`) }}
                </dt>
                <dd class="font-semibold">
                  {{
                    subject.progress[
                      metric === "overdueItems" ? "overdue" : metric
                    ]
                  }}
                </dd>
              </div>
            </dl>
          </details>
          <details>
            <summary
              class="min-h-11 cursor-pointer content-center font-semibold"
            >
              {{ t("prephub.notebook.customSections") }}
            </summary>
            <p class="mb-3 text-xs text-slate-500">
              {{ t("prephub.notebook.sectionsHelp") }}
            </p>
            <ol class="divide-y divide-slate-100 dark:divide-white/10">
              <li
                v-for="(section, index) in subject.sections"
                :key="section.id"
                class="flex items-center gap-1 py-1"
              >
                <button
                  type="button"
                  class="min-h-11 min-w-0 flex-1 break-words text-left text-sm font-medium"
                  @click="sectionEditorId = section.id"
                >
                  {{ section.title }}</button
                ><button
                  type="button"
                  class="prep-icon"
                  :disabled="busy || index === 0"
                  :aria-label="`${t('prephub.moveUp')}: ${section.title}`"
                  @click="moveSection(section.id, -1)"
                >
                  <ArrowUp class="size-4" aria-hidden="true" /></button
                ><button
                  type="button"
                  class="prep-icon"
                  :disabled="busy || index === subject.sections.length - 1"
                  :aria-label="`${t('prephub.moveDown')}: ${section.title}`"
                  @click="moveSection(section.id, 1)"
                >
                  <ArrowDown class="size-4" aria-hidden="true" />
                </button>
              </li>
            </ol>
            <button
              type="button"
              class="prep-button mt-3"
              :disabled="busy || subject.sections.length >= 32"
              @click="addSection = true"
            >
              {{ t("prephub.addSection") }}
            </button>
          </details>
          <details>
            <summary
              class="min-h-11 cursor-pointer content-center font-semibold"
              @click="!historyOpen && !historyBusy && loadHistory()"
            >
              {{ t("prephub.history") }}
            </summary>
            <p v-if="historyBusy" role="status" class="text-xs text-slate-500">
              {{ t("prephub.loading") }}
            </p>
            <ol v-if="historyOpen" class="space-y-3 pb-3">
              <li v-for="entry in history" :key="entry.id" class="text-xs">
                <p>{{ entry.action }}</p>
                <time class="text-slate-500">{{ date(entry.createdAt) }}</time>
              </li>
            </ol>
            <div v-if="historyOpen" class="flex gap-2">
              <button
                type="button"
                class="prep-button"
                :disabled="historyBusy || historyPage === 1"
                @click="loadHistory(historyPage - 1)"
              >
                {{ t("prephub.previous") }}</button
              ><button
                type="button"
                class="prep-button"
                :disabled="historyBusy || history.length < 50"
                @click="loadHistory(historyPage + 1)"
              >
                {{ t("prephub.next") }}
              </button>
            </div>
          </details>
          <div
            class="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-white/10"
          >
            <button
              type="button"
              class="prep-button"
              :disabled="busy"
              @click="
                subject.status === 'ARCHIVED'
                  ? mutate('/restore', 'POST')
                  : mutate('', 'PATCH', { status: 'ARCHIVED' })
              "
            >
              {{
                t(
                  subject.status === "ARCHIVED"
                    ? "prephub.restore"
                    : "prephub.archive",
                )
              }}</button
            ><button
              type="button"
              class="prep-button text-red-600 dark:text-red-300"
              :disabled="busy"
              @click="confirm(deleteSubject)"
            >
              {{ t("prephub.delete") }}
            </button>
          </div>
        </div>
      </PrepDialog>
      <PrepDialog
        :open="edit"
        :title="t('prephub.notebook.editSubject')"
        :busy="busy"
        :error="error"
        @close="edit = false"
        ><PrepSubjectForm
          :subject="subject"
          :time-zone="timeZone"
          :busy="busy"
          :submit="saveSubject"
          @cancel="edit = false"
      /></PrepDialog>
      <PrepDialog
        :open="reminderOpen"
        :title="t('prephub.notebook.reminder')"
        :busy="busy"
        :error="error"
        @close="reminderOpen = false"
        ><PrepReminders
          :subject="subject"
          :time-zone="timeZone"
          :busy="busy"
          :mutate="mutate"
          :confirm="confirm"
        /><button
          v-if="!subject.eventAt && !subject.deadlineAt"
          type="button"
          class="prep-button mt-3"
          @click="edit = true"
        >
          {{ t("prephub.notebook.addDate") }}
        </button></PrepDialog
      >
      <PrepDialog
        :open="addSection"
        :title="t('prephub.addSection')"
        :busy="busy"
        :error="error"
        @close="addSection = false"
        ><form class="space-y-4" @submit.prevent="createSection">
          <label class="prep-label"
            >{{ t("prephub.sectionType")
            }}<ModernSelect v-model="sectionForm.type" class="mt-1 w-full"
              ><option v-for="type in PREP_TYPES" :key="type" :value="type">
                {{ t(`prephub.${type}`) }}
              </option></ModernSelect
            ></label
          ><label class="prep-label"
            >{{ t("prephub.title")
            }}<input
              v-model="sectionForm.title"
              class="prep-input"
              maxlength="160"
              :placeholder="t(`prephub.${sectionForm.type}`)" /></label
          ><button class="prep-primary" :disabled="busy">
            {{ t("prephub.save") }}
          </button>
        </form></PrepDialog
      >
      <PrepDialog
        :open="Boolean(managedSection)"
        :title="managedSection?.title || t('prephub.notebook.customSections')"
        :busy="busy"
        :error="error"
        @close="sectionEditorId = null"
        ><template v-if="managedSection"
          ><PrepSection
            :section="managedSection"
            :anchor="false"
            :subject-id="id"
            :time-zone="timeZone"
            :busy="busy"
            :error="error"
            :mutate="mutate"
            :confirm="confirm"
            @move="moveSection(managedSection.id, $event)" /></template
      ></PrepDialog>
      <PrepCapture
        :open="capture"
        :subject="subject"
        :time-zone="timeZone"
        :initial-type="captureType"
        :target-section-id="captureTarget"
        simple
        @close="capture = false"
        @saved="load()"
      />
      <PrepDialog
        :open="Boolean(pendingDelete)"
        :title="t('prephub.confirmTitle')"
        :busy="busy"
        :error="error"
        @close="pendingDelete = null"
        ><p class="text-sm text-slate-600 dark:text-white/70">
          {{ t("prephub.confirmDescription") }}
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="prep-button"
            :disabled="busy"
            @click="pendingDelete = null"
          >
            {{ t("prephub.cancel") }}</button
          ><button
            type="button"
            class="prep-primary"
            :disabled="busy"
            @click="confirmDelete"
          >
            {{ t("prephub.delete") }}
          </button>
        </div></PrepDialog
      >
    </template>
  </main>
</template>
