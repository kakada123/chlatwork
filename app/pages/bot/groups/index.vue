<script setup lang="ts">
import {
  groupApi,
  type GroupSummary,
} from "~/services/group-workspaces.service";
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
      error.value = "Could not verify your group permissions. Try refreshing.";
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
          <h1 class="text-2xl font-bold">Your groups</h1>
          <p class="mt-2 text-sm text-slate-500">
            Each group has its own settings. You must remain a group
            administrator.
          </p>
        </div>
        <BotGroupConnect />
      </section>
      <p v-if="error" role="alert" class="text-rose-600">
        {{ error }} <button class="underline" @click="load(page)">Refresh</button>
      </p>
      <p v-if="loading" role="status">Loading groups…</p>
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
                ? "Connected"
                : "Reconnect to restore permissions"
            }}
            · {{ group.enabled ? "Enabled" : "Paused" }}
          </p>
          <span class="mt-4 inline-block text-sm font-medium text-violet-600"
            >Manage group →</span
          ></NuxtLink
        >
      </div>
      <p
        v-if="!loading && !groups.length && !error"
        class="rounded-2xl bg-white p-6 text-slate-500 dark:bg-slate-900"
      >
        Connect your first group to set up voting, split and KHQR, or Creator
        tools.
      </p>
      <div class="flex justify-between">
        <button v-if="page > 1" class="underline" @click="load(page - 1)">
          Previous</button
        ><button v-if="hasMore" class="underline" @click="load(page + 1)">
          Next
        </button>
      </div>
    </template>
  </div>
</template>
