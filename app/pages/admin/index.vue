<script setup lang="ts">
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Users,
  UserRoundPlus,
  Wrench,
} from "lucide-vue-next";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import { LANDING_TOOLS } from "~/data/tools";

type AnalyticsRange = "7d" | "30d" | "90d";

type AdminUserSummary = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type AdminAnalytics = {
  range: AnalyticsRange;
  generatedAt: string;
  overview: {
    totalUsers: number;
    activeUsers: number;
    toolOpens: number;
    completions: number;
    newUsers: number;
  };
  dailyActivity: Array<{
    date: string;
    opens: number;
    completions: number;
    activeUsers: number;
  }>;
  topTools: Array<{
    toolKey: string;
    opens: number;
    completions: number;
    uniqueUsers: number;
    lastUsedAt: string | null;
  }>;
  topUsers: Array<AdminUserSummary & {
    activityCount: number;
    lastActiveAt: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    toolKey: string;
    event: string;
    createdAt: string;
    user: AdminUserSummary;
  }>;
};

definePageMeta({ middleware: "admin" });
useSeoMeta({ title: "Admin activity | ChlatWork", robots: "noindex, nofollow" });

const selectedRange = ref<AnalyticsRange>("30d");
const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];
const { data, status, error, refresh } = await useFetch<AdminAnalytics>("/api/admin/analytics", {
  key: "admin-analytics",
  query: computed(() => ({ range: selectedRange.value })),
});

const isLoading = computed(() => status.value === "pending");
const maxDailyOpens = computed(() => Math.max(
  1,
  ...(data.value?.dailyActivity.map((item) => item.opens) ?? []),
));
const overviewCards = computed(() => {
  const overview = data.value?.overview;
  return [
    { label: "Total users", value: overview?.totalUsers, icon: Users, tone: "sky" },
    { label: "Active users", value: overview?.activeUsers, icon: Activity, tone: "emerald" },
    { label: "Tool opens", value: overview?.toolOpens, icon: BarChart3, tone: "violet" },
    { label: "Completed actions", value: overview?.completions, icon: CheckCircle2, tone: "amber" },
    { label: "New users", value: overview?.newUsers, icon: UserRoundPlus, tone: "rose" },
  ];
});

function toolName(toolKey: string) {
  return LANDING_TOOLS.find((tool) => tool.key === toolKey)?.name
    ?? toolKey.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function toolRoute(toolKey: string) {
  return LANDING_TOOLS.find((tool) => tool.key === toolKey)?.route ?? "/tools";
}

function userLabel(user: AdminUserSummary) {
  return user.name || user.email || `User ${user.id.slice(0, 8)}`;
}

function userInitials(user: AdminUserSummary) {
  return userLabel(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function formatNumber(value: number | undefined) {
  return value === undefined ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })
    .format(new Date(`${value}T00:00:00Z`));
}
</script>

<template>
  <main class="space-y-6 pb-24 text-slate-950 sm:pb-4 dark:text-white">
    <header class="overflow-hidden rounded-3xl bg-[#082552] px-5 py-6 text-white shadow-xl shadow-sky-950/10 sm:px-8 sm:py-8 dark:border dark:border-white/10 dark:bg-[#0b1729]">
      <div class="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Administration</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Activity dashboard</h1>
          <p class="mt-3 max-w-2xl text-sm leading-6 text-sky-100/75 sm:text-base">
            See how signed-in users engage with ChlatWork tools. Activity includes only tool names and timestamps—never tool inputs or generated content.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-xl bg-white/10 p-1" aria-label="Analytics date range">
            <button
              v-for="range in ranges"
              :key="range.value"
              type="button"
              class="min-h-9 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              :class="selectedRange === range.value ? 'bg-white text-[#082552] shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'"
              :aria-pressed="selectedRange === range.value"
              @click="selectedRange = range.value"
            >
              {{ range.label }}
            </button>
          </div>
          <button type="button" class="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50" aria-label="Refresh dashboard" :disabled="isLoading" @click="refresh()">
            <RefreshCw class="size-4" :class="{ 'animate-spin': isLoading }" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

    <div v-if="error" role="alert" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200">
      Dashboard activity could not be loaded. Refresh the page or try again shortly.
    </div>

    <template v-else>
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Activity overview">
        <article v-for="card in overviewCards" :key="card.label" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-5">
          <span class="grid size-10 place-items-center rounded-xl" :class="{
            'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300': card.tone === 'sky',
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300': card.tone === 'emerald',
            'bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300': card.tone === 'violet',
            'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300': card.tone === 'amber',
            'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300': card.tone === 'rose',
          }">
            <component :is="card.icon" class="size-5" aria-hidden="true" />
          </span>
          <strong class="mt-5 block text-2xl font-semibold tracking-tight sm:text-3xl">{{ formatNumber(card.value) }}</strong>
          <span class="mt-1 block text-xs font-medium text-slate-500 dark:text-white/45">{{ card.label }}</span>
        </article>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6" aria-labelledby="activity-trend-title">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">Engagement</p>
            <h2 id="activity-trend-title" class="mt-1 text-xl font-semibold">Daily tool opens</h2>
          </div>
          <p v-if="data" class="text-xs text-slate-500 dark:text-white/45">Updated {{ formatDateTime(data.generatedAt) }}</p>
        </div>

        <div v-if="isLoading && !data" class="mt-6 h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
        <div v-else-if="data" class="mt-7 overflow-x-auto pb-2">
          <div class="flex h-52 min-w-[42rem] items-end gap-1.5 border-b border-slate-200 px-1 dark:border-white/10" role="img" :aria-label="`Daily tool opens over ${selectedRange}`">
            <div v-for="day in data.dailyActivity" :key="day.date" class="group relative flex h-full min-w-0 flex-1 items-end">
              <div class="w-full rounded-t bg-gradient-to-t from-sky-700 to-cyan-400 transition group-hover:from-sky-600 group-hover:to-cyan-300 dark:from-cyan-600 dark:to-cyan-300" :style="{ height: `${Math.max(day.opens > 0 ? 5 : 1, (day.opens / maxDailyOpens) * 100)}%` }" />
              <span class="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                {{ formatChartDate(day.date) }} · {{ day.opens }} opens · {{ day.activeUsers }} users
              </span>
            </div>
          </div>
          <div v-if="data.dailyActivity.length" class="mt-2 flex min-w-[42rem] justify-between text-[10px] font-medium text-slate-400 dark:text-white/35">
            <span>{{ formatChartDate(data.dailyActivity[0]!.date) }}</span>
            <span>{{ formatChartDate(data.dailyActivity[data.dailyActivity.length - 1]!.date) }}</span>
          </div>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6" aria-labelledby="top-tools-title">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">Tools</p>
              <h2 id="top-tools-title" class="mt-1 text-xl font-semibold">Most used tools</h2>
            </div>
            <Wrench class="size-5 text-slate-400" aria-hidden="true" />
          </div>
          <div v-if="data?.topTools.length" class="mt-5 divide-y divide-slate-100 dark:divide-white/[0.08]">
            <NuxtLink v-for="(tool, index) in data.topTools" :key="tool.toolKey" :to="toolRoute(tool.toolKey)" class="group flex items-center gap-3 py-3.5 first:pt-0 last:pb-0">
              <span class="w-5 text-center text-xs font-bold text-slate-400">{{ index + 1 }}</span>
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-300"><ToolIcon :name="tool.toolKey" class="size-5" /></span>
              <span class="min-w-0 flex-1">
                <strong class="block truncate text-sm group-hover:text-sky-700 dark:group-hover:text-cyan-300">{{ toolName(tool.toolKey) }}</strong>
                <span class="mt-1 block text-xs text-slate-500 dark:text-white/45">{{ tool.uniqueUsers }} users · {{ tool.completions }} completed</span>
              </span>
              <span class="text-right"><strong class="block text-sm">{{ formatNumber(tool.opens) }}</strong><span class="text-[10px] uppercase tracking-wide text-slate-400">opens</span></span>
              <ArrowUpRight class="size-4 text-slate-300 transition group-hover:text-sky-600 dark:text-white/20 dark:group-hover:text-cyan-300" aria-hidden="true" />
            </NuxtLink>
          </div>
          <p v-else-if="!isLoading" class="mt-5 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-white/[0.04] dark:text-white/45">No tool activity in this period.</p>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#101214] sm:p-6" aria-labelledby="top-users-title">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">People</p>
          <h2 id="top-users-title" class="mt-1 text-xl font-semibold">Most active users</h2>
          <div v-if="data?.topUsers.length" class="mt-5 space-y-4">
            <div v-for="user in data.topUsers" :key="user.id" class="flex items-center gap-3">
              <span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-violet-50 text-xs font-bold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">
                <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" class="size-full object-cover" referrerpolicy="no-referrer" />
                <span v-else>{{ userInitials(user) }}</span>
              </span>
              <span class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ userLabel(user) }}</strong><span class="block truncate text-xs text-slate-500 dark:text-white/45">{{ user.email || formatDateTime(user.lastActiveAt) }}</span></span>
              <span class="rounded-lg bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700 dark:bg-violet-400/10 dark:text-violet-300">{{ user.activityCount }}</span>
            </div>
          </div>
          <p v-else-if="!isLoading" class="mt-5 text-sm text-slate-500 dark:text-white/45">No active users in this period.</p>
        </section>
      </div>

      <section class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101214]" aria-labelledby="recent-activity-title">
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
          <div><p class="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Live feed</p><h2 id="recent-activity-title" class="mt-1 text-xl font-semibold">Recent activity</h2></div>
          <Clock3 class="size-5 text-slate-400" aria-hidden="true" />
        </div>

        <div v-if="data?.recentActivity.length" class="divide-y divide-slate-100 dark:divide-white/[0.08]">
          <article v-for="item in data.recentActivity" :key="item.id" class="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_8rem] sm:items-center sm:px-6">
            <div class="flex min-w-0 items-center gap-3">
              <span class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-white/10 dark:text-white/70">
                <img v-if="item.user.avatarUrl" :src="item.user.avatarUrl" alt="" class="size-full object-cover" referrerpolicy="no-referrer" />
                <span v-else>{{ userInitials(item.user) }}</span>
              </span>
              <span class="min-w-0"><strong class="block truncate text-sm">{{ userLabel(item.user) }}</strong><span class="block truncate text-xs text-slate-500 dark:text-white/45">{{ item.user.email || `ID ${item.user.id.slice(0, 8)}` }}</span></span>
            </div>
            <div class="flex items-center gap-2 pl-12 sm:pl-0">
              <ToolIcon :name="item.toolKey" class="size-4 shrink-0 text-sky-700 dark:text-cyan-300" />
              <span class="truncate text-sm font-medium">{{ toolName(item.toolKey) }}</span>
              <span class="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" :class="item.event === 'COMPLETE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300' : 'bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300'">{{ item.event }}</span>
            </div>
            <time :datetime="item.createdAt" class="pl-12 text-xs text-slate-500 dark:text-white/45 sm:pl-0 sm:text-right">{{ formatDateTime(item.createdAt) }}</time>
          </article>
        </div>
        <p v-else-if="!isLoading" class="p-8 text-center text-sm text-slate-500 dark:text-white/45">No recent activity in this period.</p>
      </section>
    </template>
  </main>
</template>
