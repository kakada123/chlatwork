<script setup lang="ts">
import { Plus, ArrowLeft, ClipboardCheck, Zap, Share2 } from "lucide-vue-next";
import {
  PREP_STATUSES,
  PREP_TYPES,
  type PrepSubject,
  type PrepDashboard,
  type PrepMutation,
} from "~/lib/prephub";
import WorkspaceFilters from "~/components/layout/WorkspaceFilters.vue";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import PrepShareSettings from "./PrepShareSettings.vue";
import PrepDialog from "./PrepDialog.vue";
import PrepSubjectForm from "./PrepSubjectForm.vue";
import PrepSection from "./PrepSection.vue";
import PrepCapture from "./PrepCapture.vue";
import PrepReminders from "./PrepReminders.vue";
import PrepInbox from "./PrepInbox.vue";
import PrepFormattedText from "./PrepFormattedText.vue";
import "~/assets/css/prephub.css";
const props = defineProps<{ id: string; review?: boolean }>();
const { t } = useAppI18n();
const { linkTo } = useProductDomain();
const { request, owner, timeZone, error, busy, feedback, fail, date } =
  usePrepHub();
const subject = ref<PrepSubject | null>(null);
const loading = ref(true);
const shareOpen = ref(false);
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
    class="prephub mx-auto max-w-6xl space-y-4 pb-24 text-slate-950 dark:text-white"
  >
    <nav class="flex flex-wrap items-center justify-between gap-2">
      <NuxtLink :to="linkTo('/prephub')" class="prep-button"
        ><ArrowLeft class="size-4" aria-hidden="true" />{{
          t("prephub.back")
        }}</NuxtLink
      ><NuxtLink
        v-if="subject"
        :to="linkTo(review ? `/prephub/${id}` : `/prephub/${id}/review`)"
        class="prep-button"
        ><ClipboardCheck class="size-4" aria-hidden="true" />{{
          t(review ? "prephub.workspace" : "prephub.review")
        }}</NuxtLink
      >
      <button
        v-if="subject && owner"
        type="button"
        class="prep-button"
        @click="shareOpen = true"
      >
        <Share2 class="size-4" aria-hidden="true" />{{ t("prephub.share") }}
      </button>
    </nav>
    <PrepDialog
      :open="shareOpen"
      :title="t('prephub.shareWorkspace')"
      @close="shareOpen = false"
      ><PrepShareSettings
        v-if="shareOpen && subject && owner"
        :key="subject.id"
        :subject-id="subject.id"
    /></PrepDialog>
    <PrepInbox v-if="owner" :time-zone="timeZone" />
    <p v-if="loading" role="status" class="prep-panel animate-pulse">
      {{ t("prephub.loading") }}
    </p>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ error }}
      <button
        type="button"
        class="underline"
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
      <header class="prep-panel">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-sky-700 dark:text-sky-300">
              PrepHub · {{ t(`prephub.${subject.category}`) }} ·
              {{ t(`prephub.${subject.status}`) }}
            </p>
            <h1 class="mt-1 break-words text-2xl font-bold">
              {{ subject.title }}
            </h1>
            <p
              v-if="subject.description"
              class="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600 dark:text-white/65"
            >
              {{ subject.description }}
            </p>
          </div>
          <div v-if="!review" class="flex gap-2">
            <button
              type="button"
              class="prep-button"
              :disabled="busy"
              @click="edit = true"
            >
              {{ t("prephub.edit") }}</button
            ><button
              type="button"
              class="prep-primary"
              :disabled="busy"
              @click="capture = true"
            >
              <Zap class="size-4" aria-hidden="true" />{{
                t("prephub.quickCapture")
              }}
            </button>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <p v-if="subject.eventAt">
            {{ t("prephub.EVENT") }}: {{ date(subject.eventAt) }}
          </p>
          <p v-if="subject.deadlineAt">
            {{ t("prephub.deadlineAt") }}: {{ date(subject.deadlineAt) }}
          </p>
          <p v-if="!subject.eventAt && !subject.deadlineAt">
            {{ t("prephub.noSchedule") }}
          </p>
          <p>{{ timeZone }}</p>
        </div>
        <div
          v-if="subject.goal"
          class="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-white/5"
        >
          <h2 class="text-xs font-semibold text-slate-500">
            {{ t("prephub.goal") }}
          </h2>
          <PrepFormattedText class="mt-1" :text="subject.goal" />
        </div>
        <p v-if="review" class="mt-3 text-sm text-slate-500">
          {{ t("prephub.readyReviewHint") }}
        </p>
      </header>
      <div
        class="grid items-start gap-4"
        :class="review ? '' : 'lg:grid-cols-[minmax(0,1fr)_18rem]'"
      >
        <div class="order-2 min-w-0 space-y-4 lg:order-1">
          <section class="prep-panel" aria-labelledby="prep-progress">
            <div class="flex items-center justify-between gap-2">
              <h2 id="prep-progress" class="font-semibold">
                {{ t("prephub.progress") }}
              </h2>
              <strong>{{ subject.progress.percent }}%</strong>
            </div>
            <progress
              class="mt-3 h-2 w-full accent-sky-700"
              :value="subject.progress.completed"
              :max="subject.progress.total || 1"
              :aria-label="t('prephub.progress')"
            />
            <p class="mt-2 text-xs text-slate-500">
              {{
                subject.progress.total
                  ? t("prephub.progressCount", {
                      completed: subject.progress.completed,
                      total: subject.progress.total,
                    })
                  : t("prephub.noRequirements")
              }}
            </p>
            <WorkspaceFilters :title="t('ui.requirements')" class="mt-3">
              <dl class="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                <div
                  v-for="m in [
                    'remaining',
                    'overdueItems',
                    'unansweredResearch',
                    'unansweredQuestions',
                    'missingDeliverables',
                  ] as const"
                  :key="m"
                  class="rounded-xl bg-slate-50 p-2 dark:bg-white/5"
                >
                  <dt class="text-xs text-slate-500">
                    {{ t(`prephub.${m}`) }}
                  </dt>
                  <dd class="mt-1 font-semibold">
                    {{ subject.progress[m === "overdueItems" ? "overdue" : m] }}
                  </dd>
                </div>
              </dl>
              <p class="mt-3 text-xs text-slate-500">
                {{ t("prephub.readyHint") }}
              </p>
            </WorkspaceFilters>
          </section>
          <nav
            v-if="visibleSections.length"
            class="flex gap-2 overflow-x-auto pb-1"
            :aria-label="t('prephub.workspace')"
          >
            <a
              v-for="s in visibleSections"
              :key="s.id"
              :href="`#section-${s.id}`"
              class="prep-button shrink-0"
              >{{ s.title }}</a
            >
          </nav>
          <PrepSection
            v-for="s in visibleSections"
            :key="s.id"
            :section="s"
            :error="error"
            :subject-id="id"
            :time-zone="timeZone"
            :busy="busy"
            :mutate="mutate"
            :confirm="confirm"
            :review="review"
            @move="moveSection(s.id, $event)"
          />
          <p
            v-if="!visibleSections.length"
            class="prep-panel text-sm text-slate-500"
          >
            {{ t("prephub.noMaterials") }}
          </p>
          <button
            v-if="!review"
            type="button"
            class="prep-button w-full"
            :disabled="busy || subject.sections.length >= 32"
            @click="addSection = true"
          >
            <Plus class="size-4" aria-hidden="true" />{{
              t("prephub.addSection")
            }}
          </button>
        </div>
        <aside v-if="!review" class="order-1 min-w-0 lg:order-2">
          <WorkspaceFilters :title="t('ui.details')"
            ><div class="space-y-4">
              <section class="prep-panel">
                <form
                  class="space-y-3"
                  @submit.prevent="mutate('', 'PATCH', { status: statusValue })"
                >
                  <label class="prep-label"
                    >{{ t("prephub.status")
                    }}<ModernSelect
                      v-model="statusValue"
                      class="mt-1 w-full"
                      :disabled="busy"
                    >
                      <option
                        v-for="v in PREP_STATUSES.filter(
                          (v) => v !== 'ARCHIVED',
                        )"
                        :key="v"
                        :value="v"
                      >
                        {{ t(`prephub.${v}`) }}
                      </option>
                      <option
                        v-if="subject.status === 'ARCHIVED'"
                        value="ARCHIVED"
                      >
                        {{ t("prephub.ARCHIVED") }}
                      </option>
                    </ModernSelect></label
                  ><button
                    class="prep-button w-full"
                    :disabled="busy || statusValue === subject.status"
                  >
                    {{ t("prephub.statusUpdate") }}
                  </button>
                </form>
                <button
                  v-if="subject.status === 'ARCHIVED'"
                  type="button"
                  class="prep-button mt-2 w-full"
                  :disabled="busy"
                  @click="mutate('/restore', 'POST')"
                >
                  {{ t("prephub.restore") }}</button
                ><button
                  v-else
                  type="button"
                  class="prep-button mt-2 w-full"
                  :disabled="busy"
                  @click="mutate('', 'PATCH', { status: 'ARCHIVED' })"
                >
                  {{ t("prephub.archive") }}</button
                ><button
                  type="button"
                  class="prep-button mt-2 w-full text-red-600"
                  :disabled="busy"
                  @click="confirm(deleteSubject)"
                >
                  {{ t("prephub.delete") }}
                </button>
              </section>
              <PrepReminders
                :confirm="confirm"
                :subject="subject"
                :time-zone="timeZone"
                :busy="busy"
                :mutate="mutate"
              />
              <section class="prep-panel">
                <h2 class="font-semibold">{{ t("prephub.history") }}</h2>
                <button
                  type="button"
                  class="prep-button mt-3"
                  :disabled="historyBusy"
                  @click="loadHistory()"
                >
                  {{ t("prephub.showHistory") }}
                </button>
                <ol v-if="historyOpen" class="mt-3 space-y-3">
                  <li v-for="h in history" :key="h.id" class="text-xs">
                    <p>{{ h.action }}</p>
                    <time class="text-slate-500">{{ date(h.createdAt) }}</time>
                  </li>
                </ol>
                <div v-if="historyOpen" class="mt-3 flex gap-2">
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
              </section>
            </div></WorkspaceFilters
          >
        </aside>
      </div>
      <PrepDialog
        :error="error"
        :open="edit"
        :title="t('prephub.edit')"
        :busy="busy"
        @close="edit = false"
        ><PrepSubjectForm
          :subject="subject"
          :time-zone="timeZone"
          :busy="busy"
          :submit="saveSubject"
          @cancel="edit = false"
      /></PrepDialog>
      <PrepDialog
        :error="error"
        :open="addSection"
        :title="t('prephub.addSection')"
        :busy="busy"
        @close="addSection = false"
        ><form class="space-y-4" @submit.prevent="createSection">
          <label class="prep-label"
            >{{ t("prephub.sectionType")
            }}<ModernSelect v-model="sectionForm.type" class="mt-1 w-full">
              <option v-for="v in PREP_TYPES" :key="v" :value="v">
                {{ t(`prephub.${v}`) }}
              </option>
            </ModernSelect></label
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
      <PrepCapture
        :open="capture"
        :subject="subject"
        :time-zone="timeZone"
        @close="capture = false"
        @saved="load()"
      />
      <ConfirmDialog
        :open="Boolean(pendingDelete)"
        :title="t('prephub.confirmTitle')"
        :description="t('prephub.confirmDescription')"
        :confirm-label="t('prephub.delete')"
        :busy="busy"
        @close="pendingDelete = null"
        @confirm="confirmDelete"
      />
    </template>
  </main>
</template>
