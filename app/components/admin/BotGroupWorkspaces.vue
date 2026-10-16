<script setup lang="ts">
import { botAdminHeaders } from "~/services/bot-admin.service";
interface Group {
  id: string;
  title: string;
  chatId: string;
  status: "ACTIVE" | "SUSPENDED";
  version: number;
  connections: { bot: string; health: string; enabled: boolean }[];
  _count: { managers: number };
}
const { user } = useAuth();
const groups = shallowRef<Group[]>([]);
const selected = shallowRef<Group | null>(null);
const reason = ref("");
const error = ref("");
const busy = ref(false);
const page = ref(1);
let request = 0;
async function load(next = 1) {
  const version = ++request;
  const actor = user.value?.id;
  groups.value = [];
  selected.value = null;
  error.value = "";
  if (user.value?.role !== "ADMIN") return;
  try {
    const result = await $fetch<{ items: Group[] }>("/api/admin/bots/groups", {
      query: { page: next },
    });
    if (
      version === request &&
      user.value?.id === actor &&
      user.value.role === "ADMIN"
    ) {
      groups.value = result.items;
      page.value = next;
    }
  } catch {
    if (version === request) error.value = "Could not load group workspaces.";
  }
}
async function review() {
  const group = selected.value;
  const actor = user.value?.id;
  const version = request;
  if (
    !group ||
    reason.value.trim().length < 3 ||
    busy.value ||
    user.value?.role !== "ADMIN"
  )
    return;
  const status = group.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
  if (
    !window.confirm(
      `${status === "ACTIVE" ? "Restore" : "Suspend"} ${group.title}?`,
    )
  )
    return;
  busy.value = true;
  try {
    await $fetch(`/api/admin/bots/groups/${group.id}/status`, {
      method: "POST",
      headers: { ...botAdminHeaders, "Idempotency-Key": crypto.randomUUID() },
      body: {
        expectedVersion: group.version,
        status,
        reason: reason.value.trim(),
      },
    });
    if (version === request && actor === user.value?.id) {
      reason.value = "";
      await load(page.value);
    }
  } catch {
    if (version === request)
      error.value =
        "Could not update the group. Refresh before reviewing again.";
  } finally {
    busy.value = false;
  }
}
watch(
  () => user.value?.id,
  () => {
    request++;
    groups.value = [];
    selected.value = null;
  },
  { flush: "sync" },
);
watch(
  () => user.value?.role,
  (role) => {
    if (role !== "ADMIN") {
      request++;
      groups.value = [];
      selected.value = null;
    }
  },
  { flush: "sync" },
);
onMounted(() => load());
onBeforeUnmount(() => {
  request++;
});
</script>
<template>
  <section
    v-if="user?.role === 'ADMIN'"
    class="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
  >
    <div class="flex justify-between">
      <h2 class="text-lg font-semibold">Group workspaces</h2>
      <button class="text-sm text-violet-600" @click="load(page)">
        Refresh
      </button>
    </div>
    <p class="mt-2 text-sm text-slate-500">
      Suspend a group across both bots. Settings, votes, members’ accounts and
      credits are preserved.
    </p>
    <p v-if="error" role="alert" class="mt-3 text-rose-600">{{ error }}</p>
    <div class="mt-4 grid gap-3 sm:grid-cols-2">
      <button
        v-for="group in groups"
        :key="group.id"
        class="rounded-xl border p-4 text-left dark:border-slate-700"
        @click="
          selected = group;
          reason = '';
        "
      >
        <strong>{{ group.title }}</strong>
        <p class="mt-1 text-xs text-slate-500">
          {{ group.status }} · {{ group._count.managers }} manager candidates
        </p>
        <p class="mt-1 text-xs">
          {{
            group.connections
              .map((connection) => `${connection.bot}: ${connection.health}`)
              .join(" · ")
          }}
        </p>
      </button>
    </div>
    <div
      v-if="selected"
      class="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800"
    >
      <h3 class="font-semibold">{{ selected.title }}</h3>
      <label class="block text-sm"
        >Reason<input
          v-model="reason"
          :disabled="busy"
          minlength="3"
          maxlength="240"
          class="mt-1 w-full rounded-xl border bg-transparent p-2 dark:border-slate-700" /></label
      ><button
        :disabled="busy || reason.trim().length < 3"
        class="rounded-xl bg-violet-600 px-4 py-2 text-white disabled:opacity-50"
        @click="review"
      >
        {{ selected.status === "ACTIVE" ? "Suspend group" : "Restore group" }}
      </button>
    </div>
    <div class="mt-4 flex gap-4 text-sm">
      <button v-if="page > 1" class="underline" @click="load(page - 1)">
        Previous</button
      ><button
        v-if="groups.length === 20"
        class="underline"
        @click="load(page + 1)"
      >
        Next
      </button>
    </div>
  </section>
</template>
