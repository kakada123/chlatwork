<script setup lang="ts">
import {
  BarChart3,
  Heart,
  History,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-vue-next";
import CommandQuickCard from "~/components/developer-commands/CommandQuickCard.vue";
import ToolIcon from "~/components/icons/ToolIcon.vue";
import HomeToolCard from "~/components/landing/HomeToolCard.vue";
import MomentSummaryCard from "~/components/moments/MomentSummaryCard.vue";
import ConfirmDialog from "~/components/ui/ConfirmDialog.vue";
import type { PaybackHistoryItem } from "~/components/payback-calculator/PaybackCalculatorHistory.vue";
import { DEVELOPER_COMMANDS } from "~/data/developer-commands";
import { LANDING_TOOLS } from "~/data/tools";
import { buildPaybackRawFromRows, buildPaybackSharePayload } from "~/lib/payback-calculator";
import { getToolIconTone } from "~/lib/tool-icon-tones";
import type { ToolUsageSummaryItem } from "~/composables/useToolUsage";
import type { MomentSummary } from "~/types/moment";

definePageMeta({ middleware: "auth" });
useSeoMeta({ title: "Profile | ChlatWork", robots: "noindex, nofollow" });

const { user, logout } = useAuth();
const { localizeTool } = useLanguage();
const { localizeMomentPath } = useMomentLanguage();
const { favoriteToolKeys } = useToolFavorites();
const { favoriteCommandIds, toggleCommandFavorite } = useCommandFavorites();
const { clearToolUsage, getToolUsageSummary } = useToolUsage();

const isLoggingOut = ref(false);
const signOutDialogOpen = ref(false);
const historyItems = ref<PaybackHistoryItem[]>([]);
const historyCount = ref(0);
const historyLoading = ref(true);
const historyDeletingId = ref("");
const usageItems = ref<ToolUsageSummaryItem[]>([]);
const usageLoading = ref(true);
const usageClearing = ref(false);
const {
  data: momentData,
  status: momentsStatus,
  error: momentsError,
  refresh: refreshMoments,
} = await useFetch<MomentSummary[]>("/api/moments/mine", {
  key: "profile-moments",
});
const moments = computed(() => momentData.value ?? []);

const favoriteTools = computed(() => favoriteToolKeys.value
  .map((key) => LANDING_TOOLS.find((tool) => tool.key === key))
  .filter((tool): tool is (typeof LANDING_TOOLS)[number] => Boolean(tool))
  .map(localizeTool));

const favoriteCommands = computed(() => favoriteCommandIds.value
  .map((id) => DEVELOPER_COMMANDS.find((command) => command.id === id))
  .filter((command): command is (typeof DEVELOPER_COMMANDS)[number] => Boolean(command)));

const mostUsedTools = computed(() => usageItems.value
  .map((usage) => {
    const tool = LANDING_TOOLS.find((item) => item.key === usage.toolKey);
    return tool ? { ...usage, tool: localizeTool(tool) } : null;
  })
  .filter((item): item is NonNullable<typeof item> => Boolean(item))
  .slice(0, 6));

const initials = computed(() => {
  const source = user.value?.name || user.value?.email || user.value?.phone || "U";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
});

async function loadHistory() {
  historyLoading.value = true;
  try {
    const [items, countResult] = await Promise.all([
      $fetch<PaybackHistoryItem[]>("/api/payback/history"),
      $fetch<{ count: number }>("/api/payback/history/count"),
    ]);
    historyItems.value = items;
    historyCount.value = countResult.count;
  } catch {
    historyItems.value = [];
    historyCount.value = 0;
  } finally {
    historyLoading.value = false;
  }
}

async function loadToolUsage() {
  usageLoading.value = true;
  try {
    usageItems.value = await getToolUsageSummary();
  } catch {
    usageItems.value = [];
  } finally {
    usageLoading.value = false;
  }
}

async function clearUsageHistory() {
  if (!window.confirm("Clear your tool usage history? This cannot be undone.")) return;
  usageClearing.value = true;
  try {
    await clearToolUsage();
    usageItems.value = [];
  } finally {
    usageClearing.value = false;
  }
}

async function reopenHistory(item: PaybackHistoryItem) {
  const payload = buildPaybackSharePayload({
    c: item.currency,
    t: buildPaybackRawFromRows(item.rows),
    krm: item.remainderMode,
    krp: item.remainderPayer,
  });
  await navigateTo({ path: "/tools/payback-calculator", query: { p: payload } });
}

async function removeHistory(item: PaybackHistoryItem) {
  if (!window.confirm("Delete this saved calculation? This cannot be undone.")) return;
  historyDeletingId.value = item.id;
  try {
    await $fetch(`/api/payback/history/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    historyItems.value = historyItems.value.filter((entry) => entry.id !== item.id);
    historyCount.value = Math.max(0, historyCount.value - 1);
  } finally {
    historyDeletingId.value = "";
  }
}

async function signOut() {
  isLoggingOut.value = true;
  try {
    await logout();
    signOutDialogOpen.value = false;
    await navigateTo("/");
  } finally {
    isLoggingOut.value = false;
  }
}

function refreshHistoryWhenActive() {
  if (document.visibilityState === "visible") {
    void loadHistory();
    void loadToolUsage();
    void refreshMoments();
  }
}

onMounted(() => {
  void loadHistory();
  void loadToolUsage();
  window.addEventListener("focus", refreshHistoryWhenActive);
  document.addEventListener("visibilitychange", refreshHistoryWhenActive);
});

onBeforeUnmount(() => {
  window.removeEventListener("focus", refreshHistoryWhenActive);
  document.removeEventListener("visibilitychange", refreshHistoryWhenActive);
});
</script>

<template>
  <main class="space-y-8 text-slate-950 dark:text-white">
    <header class="border-b border-slate-200 pb-6 dark:border-white/10">
      <p class="text-sm font-semibold text-sky-700 dark:text-cyan-300">Your ChlatWork</p>
      <h1 class="mt-2">Profile</h1>
      <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-white/50">Manage your account, revisit your Moments and saved work, and quickly return to your favorite tools.</p>
    </header>

    <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#101214]">
      <div class="p-5 sm:p-6">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div class="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-2xl font-semibold text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">
            <img v-if="user?.avatarUrl" :src="user.avatarUrl" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" />
            <span v-else>{{ initials }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="truncate text-xl font-semibold">{{ user?.name || "ChlatWork user" }}</h2>
            <p class="mt-1 truncate text-sm text-slate-500 dark:text-white/50">{{ user?.email || user?.phone || "Signed-in account" }}</p>
            <span class="mt-3 inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200">Active account</span>
          </div>
          <button type="button" :disabled="isLoggingOut" class="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-400/25 dark:text-red-300 dark:hover:bg-red-400/10" @click="signOutDialogOpen = true">
            <LogOut class="h-4 w-4" aria-hidden="true" /> {{ isLoggingOut ? "Signing out…" : "Sign out" }}
          </button>
        </div>
      </div>

      <div class="grid border-t border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03] sm:grid-cols-2 lg:grid-cols-4" aria-live="polite">
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:border-r sm:p-5 lg:border-b-0">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200"><History class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ historyLoading ? '—' : historyCount }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ historyCount === 1 ? 'Saved calculation' : 'Saved calculations' }}</span></div>
        </div>
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:p-5 lg:border-b-0 lg:border-r">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Heart class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ favoriteTools.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ favoriteTools.length === 1 ? 'Favorite tool' : 'Favorite tools' }}</span></div>
        </div>
        <div class="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-white/10 sm:border-b-0 sm:border-r sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-400/10 dark:text-violet-300"><UserRound class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ favoriteCommands.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ favoriteCommands.length === 1 ? 'Saved command' : 'Saved commands' }}</span></div>
        </div>
        <div class="flex items-center gap-3 p-4 sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Sparkles class="h-5 w-5" aria-hidden="true" /></span>
          <div class="flex min-w-0 flex-col gap-1.5"><strong class="block text-xl leading-none">{{ momentsStatus === 'pending' || momentsError ? '—' : moments.length }}</strong><span class="block text-xs leading-4 text-slate-500 dark:text-white/45">{{ moments.length === 1 ? 'Moment' : 'Moments' }}</span></div>
        </div>
      </div>
    </section>

    <section class="space-y-4" aria-labelledby="profile-moments">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-400/10 dark:text-rose-300"><Sparkles class="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 id="profile-moments" class="text-xl font-semibold">Your Moments</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-white/50">Celebration pages you created for someone special.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <NuxtLink :to="localizeMomentPath('/moments/create')" class="inline-flex rounded-xl bg-rose-600 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Create Moment</NuxtLink>
          <NuxtLink :to="localizeMomentPath('/moments')" class="text-sm font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200">Manage all →</NuxtLink>
        </div>
      </div>

      <div v-if="momentsStatus === 'pending'" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading Moments">
        <div v-for="index in 3" :key="index" class="h-52 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <div v-else-if="momentsError" class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-200" role="alert">
        Your Moments could not be loaded. Refresh the page and try again.
      </div>
      <ul v-else-if="moments.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="moment in moments" :key="moment.id" class="min-w-0">
          <MomentSummaryCard :moment="moment" />
        </li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-center dark:border-rose-300/20 dark:bg-rose-300/5">
        <p class="text-sm text-slate-600 dark:text-white/55">You have not created a Moment yet.</p>
        <NuxtLink :to="localizeMomentPath('/moments/create')" class="mt-2 inline-flex text-sm font-semibold text-rose-700 dark:text-rose-300">Create your first Moment</NuxtLink>
      </div>
    </section>

    <ConfirmDialog
      :open="signOutDialogOpen"
      title="Sign out of ChlatWork?"
      description="You’ll need to sign in again to access your saved Moments and account activity."
      confirm-label="Sign out"
      cancel-label="Stay signed in"
      :busy="isLoggingOut"
      busy-label="Signing out…"
      @close="signOutDialogOpen = false"
      @confirm="signOut"
    />

    <PaybackCalculatorHistory :items="historyItems" :loading="historyLoading" :deleting-id="historyDeletingId" @load="reopenHistory" @remove="removeHistory" />

    <section class="space-y-4" aria-labelledby="profile-most-used-tools">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-300/10 dark:text-amber-300"><BarChart3 class="h-5 w-5" aria-hidden="true" /></span>
          <div><h2 id="profile-most-used-tools" class="text-xl font-semibold">Most used tools</h2><p class="mt-1 text-sm text-slate-500 dark:text-white/50">Based only on tool pages opened while signed in.</p></div>
        </div>
        <button v-if="mostUsedTools.length" type="button" :disabled="usageClearing" class="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-300 dark:hover:text-red-200" @click="clearUsageHistory">{{ usageClearing ? 'Clearing…' : 'Clear history' }}</button>
      </div>
      <div v-if="usageLoading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading tool usage">
        <div v-for="index in 3" :key="index" class="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      <ul v-else-if="mostUsedTools.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="item in mostUsedTools" :key="item.toolKey">
          <NuxtLink :to="item.tool.route" class="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-400 hover:bg-sky-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-cyan-300/40 dark:hover:bg-white/[0.08]">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl" :class="getToolIconTone(item.toolKey)" aria-hidden="true"><ToolIcon :name="item.toolKey" class="size-6" /></span>
            <span class="min-w-0 flex-1"><strong class="block truncate text-sm">{{ item.tool.name }}</strong><span class="mt-1 block text-xs text-slate-500 dark:text-white/50">Opened {{ item.usageCount }} {{ item.usageCount === 1 ? 'time' : 'times' }}</span></span>
          </NuxtLink>
        </li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">Use a tool while signed in and it will appear here.</p><NuxtLink to="/tools" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">Browse tools</NuxtLink></div>
    </section>

    <section id="favorite-tools" class="scroll-mt-24 space-y-4" aria-labelledby="profile-favorite-tools">
      <div class="flex items-center justify-between gap-4">
        <div><h2 id="profile-favorite-tools" class="text-xl font-semibold">Favorite tools</h2><p class="mt-1 text-sm text-slate-500 dark:text-white/50">Favorites saved in this browser.</p></div>
        <NuxtLink to="/tools" class="text-sm font-semibold text-sky-700 dark:text-cyan-300">Browse tools →</NuxtLink>
      </div>
      <ul v-if="favoriteTools.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="tool in favoriteTools" :key="tool.key"><HomeToolCard :tool="tool" /></li>
      </ul>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">You have no favorite tools yet.</p><NuxtLink to="/tools" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">Browse tools</NuxtLink></div>
    </section>

    <section class="space-y-4" aria-labelledby="profile-favorite-commands">
      <div class="flex items-center justify-between gap-4"><h2 id="profile-favorite-commands" class="text-xl font-semibold">Favorite commands</h2><NuxtLink to="/developer-commands" class="text-sm font-semibold text-sky-700 dark:text-cyan-300">Command Hub →</NuxtLink></div>
      <div v-if="favoriteCommands.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"><CommandQuickCard v-for="command in favoriteCommands" :key="command.id" :item="command" favorite @favorite="toggleCommandFavorite(command.id)" @copied="() => undefined" /></div>
      <div v-else class="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-white/15"><p class="text-sm text-slate-500 dark:text-white/50">You have no favorite commands yet.</p><NuxtLink to="/developer-commands" class="mt-2 inline-flex text-sm font-semibold text-sky-700 dark:text-cyan-300">Browse commands</NuxtLink></div>
    </section>
  </main>
</template>
