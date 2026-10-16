<script setup lang="ts">
import {
  groupApi,
  type GroupDetails,
  type GroupSummary,
} from "~/services/group-workspaces.service";
definePageMeta({ layout: "bot" });
const route = useRoute();
const { state, bot, epoch, clear } = useBotSession();
const group = shallowRef<GroupDetails | null>(null);
const groups = shallowRef<GroupSummary[]>([]);
const activity = shallowRef<Awaited<
  ReturnType<typeof groupApi.activity>
> | null>(null);
const history = shallowRef<Awaited<ReturnType<typeof groupApi.history>> | null>(
  null,
);
const directory = shallowRef<Awaited<ReturnType<typeof groupApi.khqr>> | null>(
  null,
);
const loading = ref(false);
const error = ref("");
let request = 0;
const current = (version: number, session: number, id: string) =>
  version === request &&
  session === epoch.value &&
  state.value === "ready" &&
  route.params.id === id;
function erase() {
  group.value = null;
  groups.value = [];
  activity.value = null;
  history.value = null;
  directory.value = null;
}
async function load(activityPage = 1, historyPage = 1) {
  const version = ++request;
  const session = epoch.value;
  const id = String(route.params.id);
  erase();
  error.value = "";
  if (state.value !== "ready") return;
  loading.value = true;
  try {
    const [details, list, events, qr, rounds] = await Promise.all([
      groupApi.details(id, bot.value),
      groupApi.list(bot.value),
      groupApi.activity(id, bot.value, activityPage),
      groupApi.khqr(id, bot.value),
      bot.value === "CHLATWORK"
        ? groupApi.history(id, bot.value, historyPage)
        : null,
    ]);
    if (!current(version, session, id)) return;
    group.value = details;
    groups.value = list.items;
    activity.value = events;
    directory.value = qr;
    history.value = rounds;
  } catch (cause: any) {
    if (current(version, session, id)) {
      erase();
      error.value =
        "This group could not be opened. Refresh to verify your current permissions.";
      if ((cause?.statusCode ?? cause?.status) === 401) clear();
    }
  } finally {
    if (version === request) loading.value = false;
  }
}
function denied() {
  request++;
  erase();
  error.value = "Group access changed. Refresh to verify your permissions.";
}
watch([() => route.params.id, state, bot, epoch], () => load(), {
  immediate: true,
});
onBeforeUnmount(() => {
  request++;
  erase();
});
</script>
<template>
  <div class="space-y-5">
    <!-- Keep one stable transition root while Telegram session state changes. -->
    <template v-if="state === 'ready'"
      ><BotGroupSwitcher :groups="groups" :selected="group?.workspaceId" />
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">{{ group?.title ?? "Group settings" }}</h1>
        <button
          :disabled="loading"
          class="text-sm text-violet-600 disabled:opacity-50"
          @click="load()"
        >
          Refresh
        </button>
      </div>
      <p v-if="loading" role="status">Loading group settings…</p>
      <p v-if="error" role="alert" class="text-rose-600">{{ error }}</p>
      <template v-if="group"
        ><BotGroupOverview :group="group" /><BotGroupFeatureSettings
          :key="`${group.workspaceId}:${group.workspaceVersion}:features`"
          :group="group"
          @changed="load()"
          @denied="denied" /><BotGroupVoteSettings
          v-if="bot === 'CHLATWORK'"
          :key="`${group.workspaceId}:${group.workspaceVersion}:vote`"
          :group="group"
          @changed="load()"
          @denied="denied" /><BotGroupKhqrDirectory
          v-if="directory && bot === 'CHLATWORK'"
          :directory="directory" /><BotGroupActivity
          v-if="activity"
          :activity="activity"
          :history="history"
          @activity-page="load($event, history?.page)"
          @history-page="load(activity?.page, $event)" /></template
    ></template>
  </div>
</template>
