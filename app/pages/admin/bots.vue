<script setup lang="ts">
import {
  getBotUsers,
  getBotOverview,
  getBotUser,
  type BotKind,
  type BotStatus,
  type BotUserDetails,
} from "~/services/bot-admin.service";
import { creatorCreditRequestError } from "~/lib/creator-credit-display";

definePageMeta({ middleware: ["auth", "admin"] });
useSeoMeta({ title: "Bot Admin | ChlatWork", robots: "noindex, nofollow" });
const { user } = useAuth();
const search = ref("");
const bot = ref<BotKind | "">("");
const status = ref<BotStatus | "">("");
const list = shallowRef<Awaited<ReturnType<typeof getBotUsers>> | null>(null);
const overview = shallowRef<Awaited<ReturnType<typeof getBotOverview>> | null>(
  null,
);
const details = shallowRef<BotUserDetails | null>(null);
const tab = ref<"access" | "credits" | "khqr" | "activity">("access");
const loading = ref(false);
const detailLoading = ref(false);
const error = ref("");
let listVersion = 0;
let detailVersion = 0;
const tabs = [
  { id: "access", label: "Access" },
  { id: "credits", label: "Credits & limits" },
  { id: "khqr", label: "KHQR" },
  { id: "activity", label: "Activity" },
] as const;
const cards = computed(() => [
  { label: "Pending approval", value: count("PENDING"), status: "PENDING" },
  { label: "Approved users", value: count("APPROVED"), status: "APPROVED" },
  {
    label: "Active in 24h",
    value:
      overview.value?.activity.reduce((sum, row) => sum + row.active, 0) ?? 0,
    status: "",
  },
  {
    label: "AI credits · 24h",
    value:
      overview.value?.usage.reduce((sum, row) => sum + row.credits, 0) ?? 0,
    status: "",
  },
]);
const failures = computed(
  () => overview.value?.usage.reduce((sum, row) => sum + row.failures, 0) ?? 0,
);
const authorized = (id: string | undefined) =>
  Boolean(id && user.value?.id === id && user.value?.role === "ADMIN");
function count(value: BotStatus) {
  return overview.value?.counts.find((row) => row.status === value)?.count ?? 0;
}
function badge(value: BotStatus) {
  if (value === "APPROVED")
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300";
  if (value === "PENDING")
    return "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300";
  return "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";
}
async function load(page = 1) {
  const actorId = user.value?.id;
  if (!authorized(actorId)) return;
  const version = ++listVersion;
  loading.value = true;
  error.value = "";
  try {
    const [users, summary] = await Promise.all([
      getBotUsers({
        search: search.value.trim().replace(/^@/, ""),
        bot: bot.value || undefined,
        status: status.value || undefined,
        page,
      }),
      getBotOverview(bot.value || undefined),
    ]);
    if (version !== listVersion || !authorized(actorId)) return;
    list.value = users;
    overview.value = summary;
  } catch (cause) {
    if (version === listVersion && authorized(actorId))
      error.value = creatorCreditRequestError(
        cause,
        "Could not load Bot Admin.",
      );
  } finally {
    if (version === listVersion) loading.value = false;
  }
}
async function select(id: string, preserveTab = false) {
  const actorId = user.value?.id;
  if (!authorized(actorId)) return;
  const version = ++detailVersion;
  detailLoading.value = true;
  details.value = null;
  if (!preserveTab) tab.value = "access";
  try {
    const result = await getBotUser(id);
    if (version === detailVersion && authorized(actorId))
      details.value = result;
  } catch (cause) {
    if (version === detailVersion && authorized(actorId))
      error.value = creatorCreditRequestError(
        cause,
        "Could not load this user.",
      );
  } finally {
    if (version === detailVersion) detailLoading.value = false;
  }
}
async function refreshed() {
  const id = details.value?.profile.userId;
  await Promise.all([
    load(list.value?.page ?? 1),
    id ? select(id, true) : Promise.resolve(),
  ]);
}
function close() {
  detailVersion++;
  details.value = null;
  detailLoading.value = false;
}
function filterStatus(value: string) {
  status.value = value as BotStatus | "";
  void load();
}
watch(
  () => [user.value?.id, user.value?.role],
  () => {
    listVersion++;
    close();
    list.value = null;
    overview.value = null;
    loading.value = false;
  },
);
onMounted(() => void load());
</script>

<template>
  <main
    class="mx-auto max-w-7xl space-y-7 px-4 py-8 text-slate-900 sm:px-6 dark:text-white"
  >
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300"
        >
          Creator + ChlatWork
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Bot Admin</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-white/55">
          One place for approvals, shared credits, and personal KHQR.
        </p>
      </div>
      <div class="flex gap-3 text-sm font-medium">
        <NuxtLink
          to="/admin"
          class="rounded-xl border border-slate-200 px-4 py-2 dark:border-white/10"
          >Analytics</NuxtLink
        >
        <NuxtLink
          to="/admin/tools"
          class="rounded-xl border border-slate-200 px-4 py-2 dark:border-white/10"
          >Tool controls</NuxtLink
        >
      </div>
    </header>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <button
        v-for="card in cards"
        :key="card.label"
        type="button"
        :disabled="loading"
        class="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-violet-300 dark:border-white/10 dark:bg-white/[0.03]"
        @click="filterStatus(card.status)"
      >
        <p class="text-xs font-medium text-slate-500 dark:text-white/50">
          {{ card.label }}
        </p>
        <p class="mt-3 text-3xl font-bold">
          {{ overview ? card.value.toLocaleString() : "—" }}
        </p>
      </button>
    </div>
    <p class="text-xs text-slate-500">
      Activity counts bot memberships; shared accounts appear once in the user
      list. {{ failures }} failed AI requests in 24h.
    </p>
    <section
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
    >
      <form
        class="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5 dark:border-white/10"
        @submit.prevent="load()"
      >
        <label class="min-w-48 flex-1 text-xs font-semibold"
          >Find a Telegram user
          <input
            v-model="search"
            type="search"
            maxlength="100"
            placeholder="Name, @username, or Telegram ID"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
          />
        </label>
        <label class="text-xs font-semibold"
          >Bot
          <select
            v-model="bot"
            class="mt-2 block rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
            @change="load()"
          >
            <option value="">Both bots</option>
            <option value="CREATOR">Creator</option>
            <option value="CHLATWORK">ChlatWork</option>
          </select>
        </label>
        <label class="text-xs font-semibold"
          >Status
          <select
            v-model="status"
            class="mt-2 block rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
            @change="load()"
          >
            <option value="">All users</option>
            <option value="PENDING">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </label>
        <button
          type="submit"
          :disabled="loading"
          class="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {{ loading ? "Loading…" : "Search" }}
        </button>
      </form>
      <p
        v-if="error"
        role="alert"
        class="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300"
      >
        {{ error }}
      </p>
      <div class="overflow-x-auto" :aria-busy="loading">
        <table class="w-full text-left text-sm">
          <thead
            class="bg-slate-50 text-xs text-slate-500 dark:bg-white/5 dark:text-white/50"
          >
            <tr>
              <th class="px-5 py-3">User</th>
              <th class="px-5 py-3">Approval</th>
              <th class="px-5 py-3">Bot permissions</th>
              <th class="px-5 py-3">Shared credits</th>
              <th class="px-5 py-3"><span class="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/10">
            <tr
              v-for="item in list?.items"
              :key="item.userId"
              class="hover:bg-slate-50 dark:hover:bg-white/[0.02]"
            >
              <td class="px-5 py-4">
                <p class="font-semibold">{{ item.name || "Telegram user" }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ item.username ? `@${item.username} · ` : ""
                  }}{{ item.telegramId }}
                </p>
                <span v-if="!item.isActive" class="text-xs text-red-600"
                  >Website account inactive</span
                >
              </td>
              <td class="px-5 py-4">
                <span
                  :class="badge(item.status)"
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  >{{ item.status }}</span
                >
              </td>
              <td class="px-5 py-4">
                <div class="flex gap-2 text-xs">
                  <span
                    :class="
                      item.creatorEnabled
                        ? 'text-violet-600 dark:text-violet-300'
                        : 'text-slate-400'
                    "
                    >Creator {{ item.creatorEnabled ? "✓" : "—" }}</span
                  ><span
                    :class="
                      item.chlatworkEnabled
                        ? 'text-violet-600 dark:text-violet-300'
                        : 'text-slate-400'
                    "
                    >ChlatWork {{ item.chlatworkEnabled ? "✓" : "—" }}</span
                  >
                </div>
              </td>
              <td class="px-5 py-4 font-semibold tabular-nums">
                {{ item.balance.toLocaleString() }}
              </td>
              <td class="px-5 py-4 text-right">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-1.5 font-medium dark:border-white/15"
                  @click="select(item.userId)"
                >
                  Manage<span class="sr-only">
                    {{ item.name || item.telegramId }}</span
                  >
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <p
          v-if="!loading && !list?.items.length"
          class="p-10 text-center text-sm text-slate-500"
        >
          No users match these filters. New requests appear after a private
          /start.
        </p>
      </div>
      <footer
        v-if="list"
        class="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-white/10"
      >
        <p>{{ list.total }} users · Page {{ list.page }}</p>
        <div class="flex gap-3">
          <button
            type="button"
            :disabled="loading || list.page <= 1"
            class="rounded-lg border px-3 py-2 disabled:opacity-30 dark:border-white/15"
            @click="load(list.page - 1)"
          >
            Previous</button
          ><button
            type="button"
            :disabled="loading || list.page * list.pageSize >= list.total"
            class="rounded-lg border px-3 py-2 disabled:opacity-30 dark:border-white/15"
            @click="load(list.page + 1)"
          >
            Next
          </button>
        </div>
      </footer>
    </section>
    <section
      v-if="details || detailLoading"
      class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-white/[0.03]"
      aria-label="Selected Telegram user"
      :aria-busy="detailLoading"
    >
      <p
        v-if="detailLoading"
        role="status"
        class="py-10 text-center text-sm text-slate-500"
      >
        Loading user…
      </p>
      <template v-else-if="details">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">
              {{ details.profile.name || "Telegram user" }}
            </h2>
            <p class="mt-1 text-xs text-slate-500">
              {{
                details.profile.username
                  ? `@${details.profile.username} · `
                  : ""
              }}Telegram {{ details.profile.telegramId }}
            </p>
          </div>
          <div class="flex gap-3 text-sm">
            <button
              type="button"
              class="text-violet-600 dark:text-violet-300"
              @click="select(details.profile.userId, true)"
            >
              Refresh</button
            ><button type="button" class="text-slate-500" @click="close">
              Close
            </button>
          </div>
        </header>
        <nav
          class="my-6 flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-white/10"
          aria-label="User management sections"
        >
          <button
            v-for="item in tabs"
            :key="item.id"
            type="button"
            :aria-pressed="tab === item.id"
            class="rounded-lg px-3 py-2 text-sm font-semibold"
            :class="
              tab === item.id
                ? 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300'
                : 'text-slate-500'
            "
            @click="tab = item.id"
          >
            {{ item.label }}
          </button>
        </nav>
        <AdminBotUserAccess
          v-if="tab === 'access'"
          :details="details"
          @saved="refreshed"
        />
        <AdminBotUserCredits
          v-else-if="tab === 'credits'"
          :details="details"
          @saved="refreshed"
        />
        <AdminBotUserKhqr
          v-else-if="tab === 'khqr'"
          :details="details"
          @saved="refreshed"
        />
        <div v-else class="space-y-6">
          <div class="grid gap-3 sm:grid-cols-2">
            <div
              v-for="membership in details.memberships"
              :key="membership.bot"
              class="rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5"
            >
              <p class="font-semibold">{{ membership.bot }}</p>
              <p class="mt-2 text-xs text-slate-500">
                Private start:
                {{
                  membership.firstPrivateStartedAt
                    ? new Date(
                        membership.firstPrivateStartedAt,
                      ).toLocaleString()
                    : "Not recorded"
                }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                Last activity:
                {{
                  membership.lastActivityAt
                    ? new Date(membership.lastActivityAt).toLocaleString()
                    : "Not recorded"
                }}
              </p>
            </div>
          </div>
          <ol class="space-y-3">
            <li
              v-for="entry in details.audit"
              :key="entry.id"
              class="rounded-xl border border-slate-100 p-4 text-sm dark:border-white/10"
            >
              <div class="flex flex-wrap justify-between gap-2">
                <p class="font-semibold">
                  {{ entry.action.replaceAll("_", " ") }}
                  <span v-if="entry.bot" class="font-normal text-slate-500"
                    >· {{ entry.bot }}</span
                  >
                </p>
                <time class="text-xs text-slate-500">{{
                  new Date(entry.createdAt).toLocaleString()
                }}</time>
              </div>
              <p v-if="entry.details.reason" class="mt-2">
                {{ entry.details.reason }}
              </p>
              <p
                v-if="entry.details.status"
                class="mt-1 text-xs text-slate-500"
              >
                {{ entry.details.previousStatus }} → {{ entry.details.status }}
              </p>
              <p
                v-if="entry.actorId"
                class="mt-2 break-all text-xs text-slate-400"
              >
                Actor {{ entry.actorId }}
              </p>
            </li>
          </ol>
          <p v-if="!details.audit.length" class="text-sm text-slate-500">
            No activity recorded yet.
          </p>
        </div>
      </template>
    </section>
  </main>
</template>
