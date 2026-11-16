<script setup lang="ts">
import { Plus, Search, Zap, CalendarDays, ArrowRight } from "lucide-vue-next";
import {
  PREP_CATEGORIES,
  type PrepSubject,
  type PrepDashboard,
  type PrepList,
} from "~/lib/prephub";
import PrepDialog from "~/components/prephub/PrepDialog.vue";
import PrepSubjectForm from "~/components/prephub/PrepSubjectForm.vue";
import PrepCapture from "~/components/prephub/PrepCapture.vue";
import PrepInbox from "~/components/prephub/PrepInbox.vue";
import "~/assets/css/prephub.css";
definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "PrepHub — ChlatWork", robots: "noindex, nofollow" });
const { t } = useAppI18n();
const { request, owner, timeZone, error, busy, feedback, fail, date } =
  usePrepHub();
const subjects = ref<PrepSubject[]>([]),
  total = ref(0),
  page = ref(1),
  loading = ref(true);
const dashboard = ref<PrepDashboard | null>(null);
const query = ref(""),
  category = ref(""),
  status = ref("ACTIVE"),
  sort = ref("UPCOMING");
const createOpen = ref(false),
  captureOpen = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let version = 0;
async function load() {
  const current = ++version;
  loading.value = true;
  error.value = "";
  try {
    const result = await request<PrepList>("/subjects", {
      query: {
        q: query.value,
        ...(category.value ? { category: category.value } : {}),
        status: status.value,
        sort: sort.value,
        page: page.value,
      },
    });
    if (current !== version) return;
    subjects.value = result.subjects;
    total.value = result.total;
  } catch (e) {
    if (current === version) fail(e);
  } finally {
    if (current === version) loading.value = false;
  }
}
async function summary() {
  try {
    dashboard.value = await request<PrepDashboard>("/dashboard");
    timeZone.value = dashboard.value.timeZone;
  } catch (e) {
    fail(e);
  }
}
async function create(body: Record<string, unknown>) {
  if (busy.value) return false;
  busy.value = true;
  error.value = "";
  try {
    const subject = await request<PrepSubject>("/subjects", {
      method: "POST",
      body,
    });
    createOpen.value = false;
    await navigateTo(`/prephub/${subject.id}`);
    return true;
  } catch (e) {
    fail(e);
    return false;
  } finally {
    busy.value = false;
  }
}
const stats = computed(() => [
  {
    key: "ACTIVE",
    count: ["DRAFT", "PREPARING", "READY"].reduce(
      (n, s) => n + (dashboard.value?.counts[s] || 0),
      0,
    ),
  },
  { key: "UPCOMING", count: dashboard.value?.upcoming || 0 },
  { key: "OVERDUE", count: dashboard.value?.overdue || 0 },
  { key: "COMPLETED", count: dashboard.value?.counts.COMPLETED || 0 },
  { key: "ARCHIVED", count: dashboard.value?.counts.ARCHIVED || 0 },
]);
watch(query, () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 250);
});
watch([category, status, sort], () => {
  page.value = 1;
  void load();
});
watch(page, () => {
  void load();
});
watch(owner, () => {
  version++;
  subjects.value = [];
  dashboard.value = null;
  total.value = 0;
  createOpen.value = false;
  captureOpen.value = false;
  if (owner.value) {
    void load();
    void summary();
  }
});
onMounted(() => {
  void load();
  void summary();
});
onBeforeUnmount(() => {
  clearTimeout(timer);
  version++;
});
function captured() {
  feedback.value = t("prephub.saved");
  void load();
  void summary();
}
</script>
<template>
  <main
    class="prephub mx-auto max-w-6xl space-y-4 pb-24 text-slate-950 dark:text-white"
  >
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold">PrepHub</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-white/60">
          {{ t("prephub.tagline") }}
        </p>
      </div>
      <div class="flex gap-2">
        <button type="button" class="prep-button" @click="captureOpen = true">
          <Zap class="size-4" aria-hidden="true" />{{
            t("prephub.quickCapture")
          }}</button
        ><button type="button" class="prep-primary" @click="createOpen = true">
          <Plus class="size-4" aria-hidden="true" />{{ t("prephub.create") }}
        </button>
      </div>
    </header>
    <PrepInbox v-if="owner" :time-zone="timeZone" />
    <nav
      class="grid grid-cols-3 gap-2 sm:grid-cols-5"
      :aria-label="t('prephub.status')"
    >
      <button
        v-for="stat in stats"
        :key="stat.key"
        type="button"
        class="prep-panel text-left"
        :class="{ 'ring-2 ring-sky-500': status === stat.key }"
        :aria-pressed="status === stat.key"
        @click="status = stat.key"
      >
        <span class="block text-xl font-bold">{{
          dashboard ? stat.count : "—"
        }}</span
        ><span class="text-xs text-slate-500 dark:text-white/60">{{
          t(`prephub.${stat.key}`)
        }}</span>
      </button>
    </nav>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="prep-label"
        ><span class="flex items-center gap-1"
          ><Search class="size-4" aria-hidden="true" />{{
            t("prephub.search")
          }}</span
        ><input
          v-model="query"
          type="search"
          class="prep-input"
          maxlength="200" /></label
      ><label class="prep-label"
        >{{ t("prephub.category")
        }}<select v-model="category" class="prep-input">
          <option value="">{{ t("prephub.allCategories") }}</option>
          <option v-for="v in PREP_CATEGORIES" :key="v" :value="v">
            {{ t(`prephub.${v}`) }}
          </option>
        </select></label
      ><label class="prep-label"
        >{{ t("prephub.status")
        }}<select v-model="status" class="prep-input">
          <option
            v-for="v in [
              'ACTIVE',
              'ALL',
              'UPCOMING',
              'OVERDUE',
              'DRAFT',
              'PREPARING',
              'READY',
              'COMPLETED',
              'ARCHIVED',
            ]"
            :key="v"
            :value="v"
          >
            {{ t(`prephub.${v}`) }}
          </option>
        </select></label
      ><label class="prep-label"
        >{{ t("prephub.sort")
        }}<select v-model="sort" class="prep-input">
          <option
            v-for="v in ['UPCOMING', 'UPDATED', 'TITLE']"
            :key="v"
            :value="v"
          >
            {{ t(`prephub.${v}`) }}
          </option>
        </select></label
      >
    </div>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ error }}
      <button
        type="button"
        class="underline"
        @click="
          load();
          summary();
        "
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
    <p v-if="loading" role="status" class="prep-panel animate-pulse">
      {{ t("prephub.loading") }}
    </p>
    <div
      v-else-if="subjects.length"
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <NuxtLink
        v-for="subject in subjects"
        :key="subject.id"
        :to="`/prephub/${subject.id}`"
        class="prep-panel group flex flex-col gap-3 transition hover:border-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
        ><div class="flex items-center justify-between gap-2 text-xs">
          <span class="text-sky-700 dark:text-sky-300">{{
            t(`prephub.${subject.category}`)
          }}</span
          ><span class="rounded-lg bg-slate-100 px-2 py-1 dark:bg-white/10">{{
            t(`prephub.${subject.status}`)
          }}</span>
        </div>
        <h2
          class="break-words font-semibold group-hover:text-sky-700 dark:group-hover:text-sky-300"
        >
          {{ subject.title }}
        </h2>
        <p
          v-if="subject.description"
          class="line-clamp-2 break-words text-sm text-slate-500 dark:text-white/60"
        >
          {{ subject.description }}
        </p>
        <div class="mt-auto">
          <p class="flex items-center gap-2 text-xs text-slate-500">
            <CalendarDays class="size-4 shrink-0" aria-hidden="true" />{{
              date(subject.eventAt || subject.deadlineAt)
            }}
          </p>
          <div class="mt-3 flex items-center justify-between gap-2 text-xs">
            <span>{{
              t("prephub.progressCount", {
                completed: subject.progress.completed,
                total: subject.progress.total,
              })
            }}</span
            ><strong>{{ subject.progress.percent }}%</strong>
          </div>
          <progress
            class="mt-1 h-2 w-full accent-sky-700"
            :value="subject.progress.completed"
            :max="subject.progress.total || 1"
            :aria-label="t('prephub.progress')"
          />
          <p
            class="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500"
          >
            <span>{{ t("prephub.updated") }} {{ date(subject.updatedAt) }}</span
            ><ArrowRight class="size-4 shrink-0" aria-hidden="true" />
          </p></div
      ></NuxtLink>
    </div>
    <p
      v-else-if="!error"
      class="prep-panel py-8 text-center text-sm text-slate-500"
    >
      {{ t("prephub.empty") }}
    </p>
    <nav
      v-if="total > 20"
      class="flex items-center justify-center gap-3"
      :aria-label="t('prephub.ALL')"
    >
      <button
        type="button"
        class="prep-button"
        :disabled="loading || page === 1"
        @click="page--"
      >
        {{ t("prephub.previous") }}</button
      ><span class="text-sm">{{ page }} / {{ Math.ceil(total / 20) }}</span
      ><button
        type="button"
        class="prep-button"
        :disabled="loading || page * 20 >= total"
        @click="page++"
      >
        {{ t("prephub.next") }}
      </button>
    </nav>
    <PrepDialog
      :error="error"
      :open="createOpen"
      :title="t('prephub.create')"
      :busy="busy"
      @close="createOpen = false"
      ><PrepSubjectForm
        :time-zone="timeZone"
        :busy="busy"
        :submit="create"
        @cancel="createOpen = false"
    /></PrepDialog>
    <PrepCapture
      :open="captureOpen"
      :time-zone="timeZone"
      @close="captureOpen = false"
      @saved="captured"
    />
  </main>
</template>
