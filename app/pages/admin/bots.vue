<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeBotCode } from "~/lib/bot-ui-copy";
const { isKhmer } = useLanguage();
import {
  getBotUsers,
  getBotOverview,
  getBotUser,
  type BotKind,
  type BotStatus,
  type BotUserDetails,
} from "~/services/bot-admin.service";
import { creatorCreditRequestError } from "~/lib/creator-credit-display";

const { t } = useAppI18n();

definePageMeta({ middleware: ["auth", "admin"] });
useSeoMeta({ title: () => t("shared.pages_admin_bots.bot_admin_chlat_work"), robots: "noindex, nofollow" });
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
const tabs = computed(() => [
  { id: "access", label: t("shared.components_bot_group_overview.access") },
  { id: "credits", label: t("shared.components_layout_product_navigation.credits_limits") },
  { id: "khqr", label: "KHQR" },
  { id: "activity", label: t("shared.components_admin_activity_dashboard.activity") },
] as const);
const cards = computed(() => [
  { label: t("shared.pages_admin_bots.pending_approval"), value: count("PENDING"), status: "PENDING" },
  { label: t("shared.pages_admin_bots.approved_users"), value: count("APPROVED"), status: "APPROVED" },
  {
    label: t("shared.pages_admin_bots.active_in_24h"),
    value:
      overview.value?.activity.reduce((sum, row) => sum + row.active, 0) ?? 0,
    status: "",
  },
  {
    label: t("shared.pages_admin_bots.ai_credits_24h"),
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
        t("shared.pages_admin_bots.could_not_load_bot_admin"),
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
        t("shared.pages_admin_bots.could_not_load_this_user"),
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
    <AdminBotGroupWorkspaces />
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p
          class="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-300"
        >
          Creator + ChlatWork
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">{{ t("shared.components_layout_product_navigation.bot_admin") }}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-white/55">
          {{ t("shared.pages_admin_bots.one_place_for_approvals_shared_credits_and_personal_khqr") }}
        </p>
      </div>
      <div class="flex gap-3 text-sm font-medium">
        <NuxtLink
          to="/admin"
          class="rounded-xl border border-slate-200 px-4 py-2 dark:border-white/10"
          >{{ t("shared.pages_admin_bots.analytics") }}</NuxtLink
        >
        <NuxtLink
          to="/admin/tools"
          class="rounded-xl border border-slate-200 px-4 py-2 dark:border-white/10"
          >{{ t("shared.pages_admin_bots.tool_controls") }}</NuxtLink
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
      {{ t("shared.pages_admin_bots.activity_counts_bot_memberships_shared_accounts_appear_once_in") }} {{ failures }} {{ t("shared.pages_admin_bots.failed_ai_requests_in_24h") }}
    </p>
    <section
      class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]"
    >
      <form
        class="flex flex-wrap items-end gap-3 border-b border-slate-100 p-5 dark:border-white/10"
        @submit.prevent="load()"
      >
        <label class="min-w-48 flex-1 text-xs font-semibold"
          >{{ t("shared.pages_admin_bots.find_a_telegram_user") }}
          <input
            v-model="search"
            type="search"
            maxlength="100"
            :placeholder="t(&quot;shared.pages_admin_bots.name_username_or_telegram_id&quot;)"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
          />
        </label>
        <label class="text-xs font-semibold"
          >{{ t("shared.components_bot_group_overview.bot") }}
          <ModernSelect
            v-model="bot"
            class="mt-2 block rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
            @change="load()"
          >
            <option value="">{{ t("shared.pages_admin_bots.both_bots") }}</option>
            <option value="CREATOR">Creator</option>
            <option value="CHLATWORK">ChlatWork</option>
          </ModernSelect>
        </label>
        <label class="text-xs font-semibold"
          >{{ t("shared.common.status") }}
          <ModernSelect
            v-model="status"
            class="mt-2 block rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm font-normal dark:border-white/15"
            @change="load()"
          >
            <option value="">{{ t("shared.pages_admin_bots.all_users") }}</option>
            <option value="PENDING">{{ t("shared.pages_admin_bots.pending_approval") }}</option>
            <option value="APPROVED">{{ t("shared.pages_admin_bots.approved") }}</option>
            <option value="REJECTED">{{ t("shared.pages_admin_bots.rejected") }}</option>
            <option value="SUSPENDED">{{ t("shared.pages_admin_bots.suspended") }}</option>
          </ModernSelect>
        </label>
        <button
          type="submit"
          :disabled="loading"
          class="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {{ loading ? t("shared.common.loading") : t("shared.common.search") }}
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
              <th class="px-5 py-3">{{ t("shared.common.user") }}</th>
              <th class="px-5 py-3">{{ t("shared.pages_admin_bots.approval") }}</th>
              <th class="px-5 py-3">{{ t("shared.pages_admin_bots.bot_permissions") }}</th>
              <th class="px-5 py-3">{{ t("shared.pages_admin_bots.shared_credits") }}</th>
              <th class="px-5 py-3"><span class="sr-only">{{ t("shared.common.actions") }}</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-white/10">
            <tr
              v-for="item in list?.items"
              :key="item.userId"
              class="hover:bg-slate-50 dark:hover:bg-white/[0.02]"
            >
              <td class="px-5 py-4">
                <p class="font-semibold">{{ item.name || t("shared.pages_admin_bots.telegram_user") }}</p>
                <p class="mt-1 text-xs text-slate-500">
                  {{ item.username ? `@${item.username} · ` : ""
                  }}{{ item.telegramId }}
                </p>
                <span v-if="!item.isActive" class="text-xs text-red-600"
                  >{{ t("shared.pages_admin_bots.website_account_inactive") }}</span
                >
              </td>
              <td class="px-5 py-4">
                <span
                  :class="badge(item.status)"
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  >{{ localizeBotCode(item.status, isKhmer ? "km" : "en") }}</span
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
                  {{ t("shared.common.manage") }}<span class="sr-only">
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
          {{ t("shared.pages_admin_bots.no_users_match_these_filters_new_requests_appear_after") }}
        </p>
      </div>
      <footer
        v-if="list"
        class="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-xs text-slate-500 dark:border-white/10"
      >
        <p>{{ list.total }} {{ t("shared.pages_admin_bots.users_page") }} {{ list.page }}</p>
        <div class="flex gap-3">
          <button
            type="button"
            :disabled="loading || list.page <= 1"
            class="rounded-lg border px-3 py-2 disabled:opacity-30 dark:border-white/15"
            @click="load(list.page - 1)"
          >
            {{ t("shared.common.previous") }}</button
          ><button
            type="button"
            :disabled="loading || list.page * list.pageSize >= list.total"
            class="rounded-lg border px-3 py-2 disabled:opacity-30 dark:border-white/15"
            @click="load(list.page + 1)"
          >
            {{ t("shared.common.next") }}
          </button>
        </div>
      </footer>
    </section>
    <section
      v-if="details || detailLoading"
      class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-white/[0.03]"
      :aria-label="t(&quot;shared.pages_admin_bots.selected_telegram_user&quot;)"
      :aria-busy="detailLoading"
    >
      <p
        v-if="detailLoading"
        role="status"
        class="py-10 text-center text-sm text-slate-500"
      >
        {{ t("shared.pages_admin_bots.loading_user") }}
      </p>
      <template v-else-if="details">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">
              {{ details.profile.name || t("shared.pages_admin_bots.telegram_user") }}
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
              {{ t("shared.common.refresh") }}</button
            ><button type="button" class="text-slate-500" @click="close">
              {{ t("shared.common.close") }}
            </button>
          </div>
        </header>
        <nav
          class="my-6 flex flex-wrap gap-2 border-b border-slate-100 pb-3 dark:border-white/10"
          :aria-label="t(&quot;shared.pages_admin_bots.user_management_sections&quot;)"
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
                {{ t("shared.pages_admin_bots.private_start") }}
                {{
                  membership.firstPrivateStartedAt
                    ? new Date(
                        membership.firstPrivateStartedAt,
                      ).toLocaleString()
                    : t("shared.pages_admin_bots.not_recorded")
                }}
              </p>
              <p class="mt-1 text-xs text-slate-500">
                {{ t("shared.pages_admin_bots.last_activity") }}
                {{
                  membership.lastActivityAt
                    ? new Date(membership.lastActivityAt).toLocaleString()
                    : t("shared.pages_admin_bots.not_recorded")
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
                  {{ localizeBotCode(entry.action, isKhmer ? "km" : "en").replaceAll("_", " ") }}
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
                {{ localizeBotCode(entry.details.previousStatus, isKhmer ? "km" : "en") }} → {{ localizeBotCode(entry.details.status, isKhmer ? "km" : "en") }}
              </p>
              <p
                v-if="entry.actorId"
                class="mt-2 break-all text-xs text-slate-400"
              >
                {{ t("shared.pages_admin_bots.actor") }} {{ entry.actorId }}
              </p>
            </li>
          </ol>
          <p v-if="!details.audit.length" class="text-sm text-slate-500">
            {{ t("shared.pages_admin_bots.no_activity_recorded_yet") }}
          </p>
        </div>
      </template>
    </section>
  </main>
</template>
