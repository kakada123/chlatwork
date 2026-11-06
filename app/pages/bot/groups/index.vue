<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import {
  groupApi,
  type GroupSummary,
} from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
definePageMeta({ layout: "bot" });
const { state, bot, epoch } = useBotSession();
const groups = shallowRef<GroupSummary[]>([]);
const error = ref("");
const loading = ref(false);
const page = ref(1);
const hasMore = ref(false);
let request = 0;
async function load(next = 1) {
  const version = ++request;
  const session = epoch.value;
  groups.value = [];
  error.value = "";
  if (state.value !== "ready") return;
  loading.value = true;
  try {
    const result = await groupApi.list(bot.value, next);
    if (
      version === request &&
      session === epoch.value &&
      state.value === "ready"
    ) {
      groups.value = result.items;
      page.value = next;
      hasMore.value = result.hasMore;
    }
  } catch {
    if (version === request)
      error.value = t("shared.pages_bot_groups_index.could_not_verify_your_group_permissions_try_refreshing");
  } finally {
    if (version === request) loading.value = false;
  }
}
watch([state, bot, epoch], () => load(), { immediate: true });
onBeforeUnmount(() => {
  request++;
  groups.value = [];
});
</script>
<template>
  <div class="space-y-5">
    <!-- Keep one stable transition root while Telegram session state changes. -->
    <template v-if="state === 'ready'">
      <section class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold">{{ t("shared.pages_bot_groups_index.your_groups") }}</h1>
          <p class="mt-2 text-sm text-slate-500">
            {{ t("shared.pages_bot_groups_index.each_group_has_its_own_settings_you_must_remain") }}
          </p>
        </div>
        <BotGroupConnect />
      </section>
      <p v-if="error" role="alert" class="text-rose-600">
        {{ error }} <button class="underline" @click="load(page)">{{ t("shared.common.refresh") }}</button>
      </p>
      <p v-if="loading" role="status">{{ t("shared.components_admin_member_khqr_manager.loading_groups") }}</p>
      <div v-else class="grid gap-3 sm:grid-cols-2">
        <NuxtLink
          v-for="group in groups"
          :key="group.workspaceId"
          :to="{ path: `/bot/groups/${group.workspaceId}`, query: { bot } }"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          ><h2 class="font-semibold">{{ group.title }}</h2>
          <p class="mt-2 text-sm text-slate-500">
            {{
              group.health === "CONNECTED"
                ? t("shared.components_bot_group_overview.connected")
                : "Reconnect to restore permissions"
            }}
            · {{ group.enabled ? t("shared.common.enabled") : t("shared.components_bot_group_overview.paused") }}
          </p>
          <span class="mt-4 inline-block text-sm font-medium text-violet-600"
            >{{ t("shared.pages_bot_groups_index.manage_group") }}</span
          ></NuxtLink
        >
      </div>
      <p
        v-if="!loading && !groups.length && !error"
        class="rounded-2xl bg-white p-6 text-slate-500 dark:bg-slate-900"
      >
        {{ t("shared.pages_bot_groups_index.connect_your_first_group_to_set_up_voting_split") }}
      </p>
      <div class="flex justify-between">
        <button v-if="page > 1" class="underline" @click="load(page - 1)">
          {{ t("shared.common.previous") }}</button
        ><button v-if="hasMore" class="underline" @click="load(page + 1)">
          {{ t("shared.common.next") }}
        </button>
      </div>
    </template>
  </div>
</template>
