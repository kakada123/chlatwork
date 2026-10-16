<script setup lang="ts">
import type { BotKind } from "~/services/group-workspaces.service";
const route = useRoute();
const { state, bot, error, initialize, session, requestManagerAccess } =
  useBotSession();
const kind = () => (route.query.bot === "CREATOR" ? "CREATOR" : "CHLATWORK");
onMounted(() => initialize(kind()));
watch(
  () => route.query.bot,
  () => initialize(kind()),
);
useSeoMeta({ title: "My Groups | ChlatWork", robots: "noindex, nofollow" });
</script>
<template>
  <div
    class="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
  >
    <header
      class="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-3">
        <NuxtLink
          :to="{ path: '/bot/groups', query: { bot } }"
          class="text-lg font-bold"
          >My Groups</NuxtLink
        >
        <nav class="flex items-center gap-4 text-sm">
          <NuxtLink :to="{ path: '/bot/account', query: { bot } }"
            >My account</NuxtLink
          ><select
            aria-label="Bot"
            :value="bot"
            class="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"
            @change="
              navigateTo({
                path: '/bot/groups',
                query: {
                  bot: ($event.target as HTMLSelectElement).value as BotKind,
                },
              })
            "
          >
            <option value="CHLATWORK">ChlatWork</option>
            <option value="CREATOR">Creator</option>
          </select>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <p
        v-if="state === 'loading'"
        role="status"
        class="py-12 text-center text-slate-500"
      >
        Verifying your Telegram account…
      </p>
      <section
        v-else-if="state === 'outside-telegram'"
        class="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"
      >
        <h1 class="text-xl font-semibold">Open this page from Telegram</h1>
        <p class="mt-3 text-slate-500">
          Send /groups privately to the ChlatWork or Creator bot, then tap My
          Groups. No website signup is needed.
        </p>
      </section>
      <section
        v-else-if="state === 'error'"
        class="rounded-2xl bg-white p-6 dark:bg-slate-900"
      >
        <p role="alert">
          {{
            error || "Your session ended. Verify your Telegram account again."
          }}
        </p>
        <button
          class="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-white"
          @click="initialize(bot)"
        >
          Try again
        </button>
      </section>
      <template v-else>
        <section
          v-if="state === 'pending'"
          class="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <h1 class="font-semibold">
            {{
              session?.managerStatus === "NOT_REQUESTED"
                ? "Manage your Telegram groups"
                : session?.managerStatus === "PENDING"
                  ? "Waiting for manager approval"
                  : "Manager access unavailable"
            }}
          </h1>
          <p class="mt-2 text-sm">
            Group members can use free features in connected groups. Approval
            lets you connect and configure groups you administer.
          </p>
          <button
            v-if="session?.managerStatus === 'NOT_REQUESTED'"
            class="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-white"
            @click="requestManagerAccess"
          >
            Request manager approval
          </button>
          <button
            v-else-if="session?.managerStatus === 'PENDING'"
            class="mt-4 underline"
            @click="initialize(bot)"
          >
            Check approval
          </button>
        </section>
        <p v-if="error" role="alert" class="text-rose-600">{{ error }}</p>
        <slot />
      </template>
    </main>
  </div>
</template>
