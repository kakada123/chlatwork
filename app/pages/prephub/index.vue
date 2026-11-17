<script setup lang="ts">
import {
  Plus,
  Search,
  Zap,
  CalendarDays,
  Layers,
  CirclePlay,
  TriangleAlert,
  CircleCheck,
  Archive,
} from "lucide-vue-next";
import {
  PREP_CATEGORIES,
  type PrepSubject,
  type PrepSubjectSummary,
  type PrepType,
  type PrepDashboard,
  type PrepList,
} from "~/lib/prephub";
import PrepSubjectCard from "~/components/prephub/PrepSubjectCard.vue";
import PrepCategoryIcon from "~/components/prephub/PrepCategoryIcon.vue";
import WorkspaceFilters from "~/components/layout/WorkspaceFilters.vue";
import PrepDialog from "~/components/prephub/PrepDialog.vue";
import PrepSubjectForm from "~/components/prephub/PrepSubjectForm.vue";
import PrepCapture from "~/components/prephub/PrepCapture.vue";
import PrepInbox from "~/components/prephub/PrepInbox.vue";
import "~/assets/css/prephub.css";
definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "PrepHub — ChlatWork", robots: "noindex, nofollow" });
const { t } = useAppI18n();
const { linkTo } = useProductDomain();
const { request, owner, timeZone, error, busy, feedback, fail } = usePrepHub();
const subjects = ref<PrepSubjectSummary[]>([]),
  total = ref(0),
  page = ref(1),
  loading = ref(true),
  hasLoaded = ref(false);
const pageSize = ref(20),
  categoryCounts = ref<Record<string, number> | null>(null);
const categoryTotal = computed(() =>
  Object.values(categoryCounts.value ?? {}).reduce(
    (sum, count) => sum + count,
    0,
  ),
);
function countText(count: number | undefined) {
  return count === undefined ? "—" : count > 999 ? "999+" : String(count);
}
function selectCategory(value: string, event: MouseEvent) {
  category.value = value;
  const button = event.currentTarget as HTMLElement;
  const strip = button.parentElement;
  if (!strip) return;
  const bounds = button.getBoundingClientRect();
  const viewport = strip.getBoundingClientRect();
  const left = bounds.left - viewport.left - 8;
  const right = bounds.right - viewport.right + 8;
  const offset = left < 0 ? left : right > 0 ? right : 0;
  if (!offset) return;
  // Scroll only this strip so revealing a category never moves the page vertically.
  strip.scrollBy({
    left: offset,
    behavior:
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
  });
}
const captureSubject = ref<PrepSubjectSummary | null>(null),
  captureType = ref<PrepType>("NOTES");
const statIcons: Record<string, unknown> = {
  ACTIVE: CirclePlay,
  UPCOMING: CalendarDays,
  OVERDUE: TriangleAlert,
  COMPLETED: CircleCheck,
  ARCHIVED: Archive,
};
const dashboard = ref<PrepDashboard | null>(null);
const query = ref(""),
  category = ref(""),
  status = ref("ACTIVE"),
  sort = ref("UPCOMING");
const activeFilterCount = computed(
  () =>
    Number(Boolean(category.value)) +
    Number(status.value !== "ACTIVE") +
    Number(sort.value !== "UPCOMING"),
);
const createOpen = ref(false),
  captureOpen = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let version = 0,
  summaryVersion = 0;
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
    pageSize.value = result.limit || 20;
    categoryCounts.value = result.categoryCounts ?? null;
    hasLoaded.value = true;
  } catch (e) {
    if (current === version) fail(e);
  } finally {
    if (current === version) loading.value = false;
  }
}
async function summary() {
  const current = ++summaryVersion;
  try {
    const result = await request<PrepDashboard>("/dashboard");
    if (current !== summaryVersion) return;
    dashboard.value = result;
    timeZone.value = result.timeZone;
  } catch (e) {
    if (current === summaryVersion) fail(e);
  }
}
function captureTask(subject: PrepSubjectSummary) {
  if (busy.value) return;
  captureSubject.value = subject;
  captureType.value = "CHECKLIST";
  captureOpen.value = true;
}
function quickCapture() {
  if (busy.value) return;
  captureSubject.value = null;
  captureType.value = "NOTES";
  captureOpen.value = true;
}
function firstPage() {
  if (page.value === 1) void load();
  else page.value = 1;
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
    await navigateTo(linkTo(`/prephub/${subject.id}`));
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
    firstPage();
  }, 250);
});
watch([category, status, sort], () => {
  firstPage();
});
watch(page, () => {
  void load();
});
watch(owner, () => {
  version++;
  summaryVersion++;
  categoryCounts.value = null;
  hasLoaded.value = false;
  loading.value = Boolean(owner.value);
  captureSubject.value = null;
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
  summaryVersion++;
});
function captured() {
  feedback.value = t("prephub.saved");
  void load();
  void summary();
}
</script>
<template>
  <main
    class="prephub prep-dashboard mx-auto max-w-6xl space-y-5 pb-24 text-slate-950 dark:text-white"
  >
    <header class="prep-dashboard-heading">
      <div class="flex min-w-0 items-center gap-3">
        <span class="prep-dashboard-logo"
          ><Layers class="size-6 sm:size-7" aria-hidden="true"
        /></span>
        <div class="min-w-0">
          <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">PrepHub</h1>
          <p class="mt-1 text-xs text-slate-500 sm:text-sm dark:text-white/60">
            {{ t("prephub.tagline") }}
          </p>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 sm:flex">
        <button
          type="button"
          class="prep-button bg-white dark:bg-neutral-950"
          :disabled="busy || !owner"
          @click="quickCapture"
        >
          <Zap class="size-4" aria-hidden="true" />{{
            t("prephub.quickCapture")
          }}</button
        ><button
          type="button"
          class="prep-primary"
          :disabled="busy || !owner"
          @click="createOpen = true"
        >
          <Plus class="size-4" aria-hidden="true" />{{ t("prephub.create") }}
        </button>
      </div>
    </header>
    <PrepInbox v-if="owner" :time-zone="timeZone" />
    <nav class="prep-dashboard-stats" :aria-label="t('prephub.status')">
      <button
        v-for="stat in stats"
        :key="stat.key"
        type="button"
        class="prep-panel prep-dashboard-stat"
        :class="{ 'prep-dashboard-stat--selected': status === stat.key }"
        :aria-pressed="status === stat.key"
        @click="status = stat.key"
      >
        <span
          class="prep-dashboard-stat-icon"
          :class="`prep-dashboard-stat-icon--${stat.key.toLowerCase()}`"
          ><component
            :is="statIcons[stat.key]"
            class="size-5 sm:size-6"
            aria-hidden="true" /></span
        ><span class="min-w-0"
          ><strong class="block text-xl font-bold tabular-nums sm:text-2xl">{{
            dashboard ? stat.count : "—"
          }}</strong
          ><span
            class="block break-words text-xs font-medium text-slate-500 dark:text-white/60"
            >{{ t(`prephub.${stat.key}`) }}</span
          ></span
        >
      </button>
    </nav>
    <div
      class="space-y-3 sm:grid sm:grid-cols-[minmax(0,1.35fr)_minmax(0,2.65fr)] sm:gap-3 sm:space-y-0"
    >
      <label class="relative block min-w-0"
        ><span class="sr-only">{{ t("prephub.search") }}</span
        ><Search
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true" /><input
          v-model="query"
          type="search"
          class="prep-input !mt-0 !min-h-12 !pl-10"
          maxlength="200"
          :placeholder="t('prephub.search')" /></label
      ><WorkspaceFilters :count="activeFilterCount"
        ><div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <label class="prep-label"
            ><span class="sr-only">{{ t("prephub.category") }}</span
            ><ModernSelect v-model="category" class="w-full"
              ><option value="">{{ t("prephub.allCategories") }}</option>
              <option
                v-for="value in PREP_CATEGORIES"
                :key="value"
                :value="value"
              >
                {{ t(`prephub.${value}`) }}
              </option></ModernSelect
            ></label
          ><label class="prep-label"
            ><span class="sr-only">{{ t("prephub.status") }}</span
            ><ModernSelect v-model="status" class="w-full"
              ><option
                v-for="value in [
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
                :key="value"
                :value="value"
              >
                {{ t(`prephub.${value}`) }}
              </option></ModernSelect
            ></label
          ><label class="prep-label"
            ><span class="sr-only">{{ t("prephub.sort") }}</span
            ><ModernSelect v-model="sort" class="w-full"
              ><option
                v-for="value in ['UPCOMING', 'UPDATED', 'TITLE']"
                :key="value"
                :value="value"
              >
                {{ t(`prephub.${value}`) }}
              </option></ModernSelect
            ></label
          >
        </div></WorkspaceFilters
      >
    </div>
    <nav
      class="flex gap-2 overflow-x-auto pb-1"
      :aria-label="t('prephub.category')"
    >
      <button
        type="button"
        class="prep-category-chip"
        :class="{ 'prep-category-chip--selected': !category }"
        :aria-pressed="!category"
        @click="selectCategory('', $event)"
      >
        {{ t("prephub.ALL")
        }}<span
          class="prep-category-count"
          :title="categoryCounts ? String(categoryTotal) : undefined"
          ><span aria-hidden="true"
            >({{ countText(categoryCounts ? categoryTotal : undefined) }})</span
          ><span class="sr-only">{{
            categoryCounts ? `(${categoryTotal})` : t("prephub.loading")
          }}</span></span
        ></button
      ><button
        v-for="value in PREP_CATEGORIES"
        :key="value"
        type="button"
        class="prep-category-chip"
        :class="{ 'prep-category-chip--selected': category === value }"
        :aria-pressed="category === value"
        @click="selectCategory(value, $event)"
      >
        <PrepCategoryIcon :category="value" class="size-4 shrink-0" />{{
          t(`prephub.${value}`)
        }}<span
          class="prep-category-count"
          :title="
            categoryCounts ? String(categoryCounts[value] || 0) : undefined
          "
          ><span aria-hidden="true"
            >({{
              countText(
                categoryCounts ? categoryCounts[value] || 0 : undefined,
              )
            }})</span
          ><span class="sr-only">{{
            categoryCounts
              ? `(${categoryCounts[value] || 0})`
              : t("prephub.loading")
          }}</span></span
        >
      </button>
    </nav>
    <div
      v-if="error"
      role="alert"
      class="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ error
      }}<button
        type="button"
        class="ml-2 min-h-11 underline"
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
    <div class="space-y-2">
      <p role="status" class="h-5 text-xs text-slate-500 dark:text-white/60">
        {{ loading ? t("prephub.loading") : "" }}
      </p>
      <!-- Refresh in place so loading does not collapse the cards or reset their controls. -->
      <section
        class="min-h-64"
        :aria-busy="loading"
        :aria-label="t('prephub.ALL')"
      >
        <div
          v-if="loading && !hasLoaded"
          class="prep-panel h-64 animate-pulse"
          aria-hidden="true"
        >
          <div class="flex items-start gap-3">
            <div
              class="size-14 shrink-0 rounded-2xl bg-slate-100 dark:bg-white/10"
            />
            <div class="flex-1 space-y-4">
              <div class="h-6 w-2/3 rounded bg-slate-100 dark:bg-white/10" />
              <div class="h-4 rounded bg-slate-100 dark:bg-white/10" />
              <div class="h-4 w-3/4 rounded bg-slate-100 dark:bg-white/10" />
              <div class="h-16 rounded-xl bg-slate-100 dark:bg-white/10" />
            </div>
          </div>
        </div>
        <div v-else-if="subjects.length" class="space-y-3">
          <PrepSubjectCard
            v-for="subject in subjects"
            :key="subject.id"
            :subject="subject"
            :time-zone="timeZone"
            :busy="busy"
            @task="captureTask"
          />
        </div>
        <p
          v-else-if="!error"
          class="prep-panel py-8 text-center text-sm text-slate-500"
        >
          {{ t("prephub.empty") }}
        </p>
      </section>
    </div>
    <nav
      v-if="total > pageSize"
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
      ><span class="text-sm"
        >{{ page }} / {{ Math.ceil(total / pageSize) }}</span
      ><button
        type="button"
        class="prep-button"
        :disabled="loading || page * pageSize >= total"
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
      :subject="captureSubject || undefined"
      :initial-type="captureSubject ? captureType : undefined"
      :time-zone="timeZone"
      simple
      @close="captureOpen = false"
      @saved="captured"
    />
  </main>
</template>
