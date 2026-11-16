<script setup lang="ts">
import {
  Plus,
  CheckCheck,
  LayoutDashboard,
  ListTodo,
  Folder,
  Flag,
  Bell,
  Trophy,
  FileText,
  Archive,
  PanelLeftClose,
} from "lucide-vue-next";
import {
  TASK_STATUSES,
  TASK_VIEWS,
  evaluationPeriod,
  type TaskView,
  type TaskRecord,
  type TaskCatalog,
  type TaskDashboard,
  type TaskPage,
  type TaskFollowUp,
} from "~/lib/work-tasks";
import TaskForm from "~/components/tasks/TaskForm.vue";
import TaskDetail from "~/components/tasks/TaskDetail.vue";
import TaskList from "~/components/tasks/TaskList.vue";
import TaskFollowUps from "~/components/tasks/TaskFollowUps.vue";
import TaskOrganization from "~/components/tasks/TaskOrganization.vue";
import TaskReportBuilder from "~/components/tasks/TaskReportBuilder.vue";
import TasksOverview from "~/components/tasks/TasksOverview.vue";
import WorkspaceDialog from "~/components/prephub/PrepDialog.vue";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import "~/assets/css/work-tasks.css";
definePageMeta({ middleware: "auth", layout: "tasks" });
useSeoMeta({ title: "ChlatWork Tasks", robots: "noindex, nofollow" });
const { t } = useAppI18n(),
  route = useRoute(),
  router = useRouter(),
  { linkTo } = useProductDomain();
const { owner, timeZone, error, feedback, busy, request, mutate, fail, date } =
  useTasksClient();
const view = computed<TaskView>(() =>
  TASK_VIEWS.includes(route.query.view as TaskView)
    ? (route.query.view as TaskView)
    : "overview",
);
const catalog = ref<TaskCatalog>({
    timeZone: "Asia/Phnom_Penh",
    projects: [],
    objectives: [],
  }),
  catalogReady = ref(false),
  dashboard = ref<TaskDashboard | null>(null),
  list = ref<TaskPage<TaskRecord>>({ items: [], total: 0, page: 1, limit: 20 }),
  followUps = ref<TaskPage<TaskFollowUp>>({
    items: [],
    total: 0,
    page: 1,
    limit: 20,
  }),
  selected = ref<TaskRecord | null>(null),
  reminders = ref<TaskFollowUp[]>([]),
  loading = ref(true),
  detailLoading = ref(false),
  createOpen = ref(false),
  board = ref(false),
  group = ref("status"),
  periodMode = ref("week"),
  followScope = ref("OPEN"),
  page = ref(1);
const period = reactive({ from: "", to: "" }),
  filters = reactive({
    q: "",
    status: "",
    category: "",
    projectId: "",
    objectiveId: "",
    sort: "UPDATED",
    focus: "",
  });
const pendingDelete = shallowRef<(() => Promise<boolean>) | null>(null);
const icons = {
  overview: LayoutDashboard,
  tasks: ListTodo,
  "work-log": CheckCheck,
  projects: Folder,
  "follow-ups": Bell,
  objectives: Flag,
  achievements: Trophy,
  reports: FileText,
  archive: Archive,
};
let mounted = false,
  viewVersion = 0,
  detailVersion = 0,
  poll: ReturnType<typeof setInterval> | undefined,
  searchTimer: ReturnType<typeof setTimeout> | undefined;
const taskId = computed(() =>
  typeof route.query.task === "string" ? route.query.task : "",
);
function navigate(key: TaskView) {
  void router.push({ path: route.path, query: { view: key } });
}
function open(id: string) {
  void router.push({ path: route.path, query: { ...route.query, task: id } });
}
function close() {
  const query = { ...route.query };
  delete query.task;
  void router.replace({ path: route.path, query });
  selected.value = null;
}
async function loadDetail() {
  const version = ++detailVersion;
  selected.value = null;
  if (!taskId.value) return;
  detailLoading.value = true;
  try {
    const task = await request<TaskRecord>(`/records/${taskId.value}`);
    if (version === detailVersion) selected.value = task;
  } catch (e) {
    if (version === detailVersion) fail(e);
  } finally {
    if (version === detailVersion) detailLoading.value = false;
  }
}
async function loadCatalog() {
  catalog.value = await request<TaskCatalog>("/catalog");
  timeZone.value = catalog.value.timeZone;
  catalogReady.value = true;
}
function changePeriod() {
  if (periodMode.value !== "custom")
    Object.assign(period, evaluationPeriod(periodMode.value, timeZone.value));
  page.value = 1;
  void loadView();
}
async function loadView() {
  if (!catalogReady.value) return;
  const version = ++viewVersion;
  loading.value = true;
  error.value = "";
  try {
    if (view.value === "overview") {
      const data = await request<TaskDashboard>("/dashboard", {
        query: { ...period },
      });
      if (version === viewVersion) dashboard.value = data;
    } else if (["tasks", "achievements", "archive"].includes(view.value)) {
      const scope =
        view.value === "achievements"
          ? "COMPLETED"
          : view.value === "archive"
            ? "ARCHIVED"
            : "ACTIVE";
      const query: Record<string, unknown> = {
        scope,
        page: page.value,
        sort: filters.sort,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      };
      if (view.value === "achievements") {
        query.from = period.from;
        query.to = period.to;
      }
      const result = await request<TaskPage<TaskRecord>>("/records", { query });
      if (version === viewVersion) list.value = result;
    } else if (view.value === "follow-ups") {
      const result = await request<TaskPage<TaskFollowUp>>("/follow-ups", {
        query: { scope: followScope.value, page: page.value },
      });
      if (version === viewVersion) followUps.value = result;
    }
  } catch (e) {
    if (version === viewVersion) fail(e);
  } finally {
    if (version === viewVersion) loading.value = false;
  }
}
async function initialize() {
  loading.value = true;
  try {
    await loadCatalog();
    Object.assign(period, evaluationPeriod(periodMode.value, timeZone.value));
    await Promise.all([loadView(), loadDetail(), loadReminders()]);
  } catch (e) {
    fail(e);
    loading.value = false;
  }
}
async function refresh() {
  await Promise.all([
    loadCatalog().catch(fail),
    loadView(),
    taskId.value ? loadDetail() : Promise.resolve(),
    loadReminders(),
  ]);
}
async function create(body: Record<string, unknown>, done = false) {
  const result = await mutate<TaskRecord>(
    done ? "/work-log" : "/records",
    "POST",
    body,
  );
  if (result) {
    createOpen.value = false;
    await refresh();
    open(result.id);
    return true;
  }
  return false;
}
async function logDone(body: Record<string, unknown>) {
  return create(body, true);
}
function confirm(action: () => Promise<boolean>) {
  pendingDelete.value = action;
}
async function confirmDelete() {
  if (await pendingDelete.value?.()) pendingDelete.value = null;
}
async function loadReminders() {
  try {
    const data = await request<TaskPage<TaskFollowUp>>("/follow-ups", {
      query: { scope: "REMINDERS", page: 1 },
    });
    reminders.value = data.items;
  } catch {
    /* Retry on the next foreground poll; primary requests show connection errors. */
  }
}
async function dismiss(f: TaskFollowUp) {
  if (await mutate(`/follow-ups/${f.id}`, "PATCH", { dismiss: true }))
    reminders.value = reminders.value.filter((r) => r.id !== f.id);
}
function filterLinked(values: Record<string, string>) {
  Object.assign(filters, {
    q: "",
    status: "",
    category: "",
    projectId: "",
    objectiveId: "",
    focus: "",
    ...values,
  });
  page.value = 1;
  if (view.value === "tasks") void loadView();
  else navigate("tasks");
}
function overviewAction(key: string) {
  Object.assign(filters, {
    q: "",
    status: "",
    category: "",
    projectId: "",
    objectiveId: "",
    focus: "",
  });
  page.value = 1;
  if (key === "dueToday") filters.focus = "DUE_TODAY";
  else if (key === "overdue") filters.focus = "OVERDUE";
  else if (key === "IN_PROGRESS") filters.status = "IN_PROGRESS";
  if (key === "completedPeriod") navigate("achievements");
  else if (key === "follow-ups") navigate("follow-ups");
  else if (key === "reports") navigate("reports");
  else navigate("tasks");
}
function applyFilters() {
  page.value = 1;
  void loadView();
}
watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 250);
  },
);
watch(view, (next) => {
  page.value = 1;
  group.value = next === "achievements" ? "day" : "status";
  if (next !== "tasks") filters.focus = "";
  if (mounted) void loadView();
});
watch(taskId, () => {
  if (mounted) void loadDetail();
});
watch(owner, () => {
  viewVersion++;
  detailVersion++;
  catalogReady.value = false;
  catalog.value = { timeZone: "Asia/Phnom_Penh", projects: [], objectives: [] };
  dashboard.value = null;
  list.value = { items: [], total: 0, page: 1, limit: 20 };
  followUps.value = { items: [], total: 0, page: 1, limit: 20 };
  selected.value = null;
  reminders.value = [];
  createOpen.value = false;
  pendingDelete.value = null;
  if (owner.value) void initialize();
});
onMounted(() => {
  mounted = true;
  void initialize();
  poll = setInterval(() => {
    if (owner.value && document.visibilityState === "visible")
      void loadReminders();
  }, 30000);
});
onBeforeUnmount(() => {
  mounted = false;
  viewVersion++;
  detailVersion++;
  clearInterval(poll);
  clearTimeout(searchTimer);
});
</script>
<template>
  <main
    class="tasks-workspace mx-auto max-w-[1400px] px-3 pb-24 pt-4 sm:px-6 lg:pb-8"
  >
    <div class="grid items-start gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav
        class="sticky top-20 hidden space-y-1 lg:block"
        :aria-label="t('tasks.name')"
      >
        <NuxtLink
          v-for="key in TASK_VIEWS"
          :key="key"
          :to="{ path: route.path, query: { view: key } }"
          class="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
          :class="
            view === key
              ? 'bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'
          "
          :aria-current="view === key ? 'page' : undefined"
          ><component
            :is="icons[key]"
            class="size-4 shrink-0"
            aria-hidden="true"
          />{{ t(`tasks.${key}`) }}</NuxtLink
        >
      </nav>
      <div class="min-w-0 space-y-4">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-xl font-bold">{{ t(`tasks.${view}`) }}</h1>
            <p class="mt-1 text-xs text-slate-500">{{ t("tasks.tagline") }}</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="task-button"
              :disabled="!catalogReady || busy"
              @click="createOpen = true"
            >
              <Plus class="size-4" aria-hidden="true" />{{
                t("tasks.create")
              }}</button
            ><button
              type="button"
              class="task-primary"
              :disabled="!catalogReady || busy"
              @click="navigate('work-log')"
            >
              <CheckCheck class="size-4" aria-hidden="true" />{{
                t("tasks.logDone")
              }}
            </button>
          </div>
        </header>
        <nav
          class="flex gap-2 overflow-x-auto pb-1 lg:hidden"
          :aria-label="t('tasks.name')"
        >
          <NuxtLink
            v-for="key in TASK_VIEWS"
            :key="key"
            :to="{ path: route.path, query: { view: key } }"
            class="task-button shrink-0"
            :class="{
              'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200':
                view === key,
            }"
            :aria-current="view === key ? 'page' : undefined"
            >{{ t(`tasks.${key}`) }}</NuxtLink
          >
        </nav>
        <aside v-if="reminders.length" class="space-y-2" aria-live="polite">
          <div
            v-for="f in reminders"
            :key="f.id"
            class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30"
          >
            <button
              type="button"
              class="min-w-0 flex-1 text-left"
              @click="open(f.taskId)"
            >
              <strong class="break-words"
                >{{ t("tasks.reminderDue") }}: {{ f.task?.title }}</strong
              ><span class="block text-xs"
                >{{ date(f.followUpAt) }} · {{ f.nextAction }}</span
              ></button
            ><button
              type="button"
              class="task-button"
              :disabled="busy"
              @click="dismiss(f)"
            >
              {{ t("tasks.dismiss") }}
            </button>
          </div>
        </aside>
        <form
          v-if="['overview', 'achievements'].includes(view) && catalogReady"
          class="task-panel flex flex-wrap items-end gap-3"
          @submit.prevent="loadView"
        >
          <label class="task-label"
            >{{ t("tasks.period")
            }}<select
              v-model="periodMode"
              class="task-input"
              @change="changePeriod"
            >
              <option
                v-for="mode in ['today', 'week', 'month', 'custom']"
                :key="mode"
                :value="mode"
              >
                {{ t(`tasks.${mode}`) }}
              </option>
            </select></label
          ><label class="task-label"
            >{{ t("tasks.from")
            }}<input
              v-model="period.from"
              type="date"
              class="task-input"
              required
              @change="periodMode = 'custom'" /></label
          ><label class="task-label"
            >{{ t("tasks.to")
            }}<input
              v-model="period.to"
              type="date"
              class="task-input"
              required
              @change="periodMode = 'custom'" /></label
          ><button class="task-button" :disabled="loading">
            {{ t("tasks.preview") }}
          </button>
          <p class="w-full text-xs text-slate-500">
            {{ t("tasks.timezone", { zone: timeZone }) }}
          </p>
        </form>
        <div
          v-if="error"
          role="alert"
          class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
        >
          {{ error }}
          <button
            type="button"
            class="underline"
            @click="catalogReady ? refresh() : initialize()"
          >
            {{ t("tasks.retry") }}
          </button>
        </div>
        <p
          v-if="feedback"
          role="status"
          class="text-sm text-emerald-700 dark:text-emerald-300"
        >
          {{ feedback }}
        </p>
        <p v-if="loading" role="status" class="task-panel animate-pulse">
          {{ t("tasks.loading") }}
        </p>
        <div
          v-if="owner && catalogReady"
          class="grid items-start gap-4"
          :class="
            selected ? 'xl:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]' : ''
          "
        >
          <div
            class="min-w-0 space-y-4"
            :class="{ 'hidden xl:block': selected }"
          >
            <TasksOverview
              v-if="view === 'overview' && dashboard"
              :dashboard="dashboard"
              :busy="busy"
              :mutate="mutate"
              @open="open"
              @changed="refresh"
              @view="overviewAction"
            /><template
              v-else-if="['tasks', 'achievements', 'archive'].includes(view)"
              ><form
                class="task-panel grid gap-3 sm:grid-cols-2"
                @submit.prevent="applyFilters"
              >
                <label class="task-label"
                  >{{ t("tasks.search")
                  }}<input
                    v-model="filters.q"
                    type="search"
                    class="task-input"
                    maxlength="200" /></label
                ><label class="task-label"
                  >{{ t("tasks.status")
                  }}<select
                    v-model="filters.status"
                    class="task-input"
                    @change="applyFilters"
                  >
                    <option value="">{{ t("tasks.all") }}</option>
                    <option v-for="s in TASK_STATUSES" :key="s" :value="s">
                      {{ t(`tasks.${s}`) }}
                    </option>
                  </select></label
                ><label class="task-label"
                  >{{ t("tasks.project")
                  }}<select
                    v-model="filters.projectId"
                    class="task-input"
                    @change="applyFilters"
                  >
                    <option value="">{{ t("tasks.all") }}</option>
                    <option
                      v-for="p in catalog.projects"
                      :key="p.id"
                      :value="p.id"
                    >
                      {{ p.name }}
                    </option>
                  </select></label
                ><label class="task-label"
                  >{{ t("tasks.objective")
                  }}<select
                    v-model="filters.objectiveId"
                    class="task-input"
                    @change="applyFilters"
                  >
                    <option value="">{{ t("tasks.all") }}</option>
                    <option
                      v-for="o in catalog.objectives"
                      :key="o.id"
                      :value="o.id"
                    >
                      {{ o.title }}
                    </option>
                  </select></label
                ><label class="task-label"
                  >{{ t("tasks.category")
                  }}<input
                    v-model="filters.category"
                    class="task-input"
                    maxlength="80"
                    @change="applyFilters" /></label
                ><label class="task-label"
                  >{{ t("tasks.sort")
                  }}<select
                    v-model="filters.sort"
                    class="task-input"
                    @change="applyFilters"
                  >
                    <option
                      v-for="s in ['UPDATED', 'DUE', 'COMPLETED', 'TITLE']"
                      :key="s"
                      :value="s"
                    >
                      {{ t(`tasks.${s}`) }}
                    </option>
                  </select></label
                ><label class="task-label"
                  >{{ t("tasks.group")
                  }}<select v-model="group" class="task-input">
                    <option
                      v-for="s in [
                        'none',
                        'status',
                        'project',
                        'category',
                        'objective',
                        ...(view === 'achievements'
                          ? ['day', 'week', 'month']
                          : []),
                      ]"
                      :key="s"
                      :value="s"
                    >
                      {{ t(`tasks.${s}`) }}
                    </option>
                  </select></label
                ><label
                  v-if="view === 'tasks'"
                  class="flex min-h-11 items-center gap-2 text-sm"
                  ><input v-model="board" type="checkbox" />{{
                    t("tasks.board")
                  }}</label
                >
                <p
                  v-if="filters.focus"
                  class="text-sm text-sky-700 dark:text-sky-300"
                >
                  {{
                    t(
                      filters.focus === "OVERDUE"
                        ? "tasks.overdue"
                        : "tasks.dueToday",
                    )
                  }}
                  <button
                    type="button"
                    class="underline"
                    @click="
                      filters.focus = '';
                      applyFilters();
                    "
                  >
                    {{ t("tasks.all") }}
                  </button>
                </p>
              </form>
              <p v-if="view === 'archive'" class="text-xs text-slate-500">
                {{ t("tasks.archivedHint") }}
              </p>
              <p class="text-xs text-slate-500">{{ t("tasks.pageHint") }}</p>
              <TaskList
                :items="list.items"
                :time-zone="timeZone"
                :group="group"
                :board="board && view === 'tasks'"
                :busy="busy"
                :mutate="mutate"
                @open="open"
                @changed="refresh"
              />
              <nav
                v-if="list.total > 20"
                class="flex items-center justify-center gap-3"
                :aria-label="t('tasks.tasks')"
              >
                <button
                  type="button"
                  class="task-button"
                  :disabled="loading || page === 1"
                  @click="
                    page--;
                    loadView();
                  "
                >
                  {{ t("tasks.previous") }}</button
                ><span class="text-sm"
                  >{{ page }} / {{ Math.ceil(list.total / 20) }}</span
                ><button
                  type="button"
                  class="task-button"
                  :disabled="loading || page * 20 >= list.total"
                  @click="
                    page++;
                    loadView();
                  "
                >
                  {{ t("tasks.next") }}
                </button>
              </nav></template
            >
            <section v-else-if="view === 'work-log'" class="task-panel">
              <TaskForm
                :log-done="true"
                :catalog="catalog"
                :busy="busy"
                :submit="logDone"
                @cancel="navigate('tasks')"
              />
            </section>
            <TaskOrganization
              v-else-if="view === 'projects' || view === 'objectives'"
              :kind="view"
              :catalog="catalog"
              :busy="busy"
              :mutate="mutate"
              :confirm="confirm"
              @changed="refresh"
              @filter="filterLinked"
            />
            <section v-else-if="view === 'follow-ups'" class="task-panel">
              <label class="task-label"
                >{{ t("tasks.status")
                }}<select
                  v-model="followScope"
                  class="task-input mb-4"
                  @change="
                    page = 1;
                    loadView();
                  "
                >
                  <option
                    v-for="s in [
                      'OPEN',
                      'OVERDUE',
                      'UPCOMING',
                      'RESOLVED',
                      'ALL',
                    ]"
                    :key="s"
                    :value="s"
                  >
                    {{ t(`tasks.${s.toLowerCase()}`) }}
                  </option>
                </select></label
              ><TaskFollowUps
                :items="followUps.items"
                :time-zone="timeZone"
                :busy="busy"
                :mutate="mutate"
                :request="request"
                :confirm="confirm"
                @changed="refresh"
                @open="open"
              />
              <nav
                v-if="followUps.total > 20"
                class="mt-4 flex justify-center gap-2"
              >
                <button
                  type="button"
                  class="task-button"
                  :disabled="page === 1 || loading"
                  @click="
                    page--;
                    loadView();
                  "
                >
                  {{ t("tasks.previous") }}</button
                ><button
                  type="button"
                  class="task-button"
                  :disabled="page * 20 >= followUps.total || loading"
                  @click="
                    page++;
                    loadView();
                  "
                >
                  {{ t("tasks.next") }}
                </button>
              </nav>
            </section>
            <TaskReportBuilder
              v-else-if="view === 'reports'"
              :catalog="catalog"
              :busy="busy"
              :mutate="mutate"
              :request="request"
              :confirm="confirm"
            />
          </div>
          <div v-if="detailLoading" role="status" class="task-panel">
            {{ t("tasks.loading") }}
          </div>
          <TaskDetail
            v-if="selected"
            :task="selected"
            :catalog="catalog"
            :busy="busy"
            :mutate="mutate"
            :request="request"
            :confirm="confirm"
            @changed="refresh"
            @close="close"
            @open="open"
          />
        </div>
      </div>
    </div>
    <WorkspaceDialog
      :open="createOpen"
      :title="t('tasks.create')"
      :busy="busy"
      :error="error"
      @close="createOpen = false"
      ><TaskForm
        :catalog="catalog"
        :busy="busy"
        :submit="create"
        @cancel="createOpen = false" /></WorkspaceDialog
    ><ConfirmDialog
      :open="Boolean(pendingDelete)"
      :title="t('tasks.confirmation')"
      :description="t('tasks.deleteHint')"
      :confirm-label="t('tasks.delete')"
      :busy="busy"
      @close="pendingDelete = null"
      @confirm="confirmDelete"
    />
  </main>
</template>
