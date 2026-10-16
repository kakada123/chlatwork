<script setup lang="ts">
import type { groupApi } from "~/services/group-workspaces.service";
defineProps<{
  activity: Awaited<ReturnType<typeof groupApi.activity>>;
  history: Awaited<ReturnType<typeof groupApi.history>> | null;
}>();
defineEmits<{ activityPage: [page: number]; historyPage: [page: number] }>();
</script>
<template>
  <section
    class="space-y-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900"
  >
    <h2 class="font-semibold">Group activity</h2>
    <ul class="divide-y divide-slate-100 text-sm dark:divide-slate-800">
      <li
        v-for="entry in activity.items"
        :key="entry.id"
        class="flex justify-between gap-4 py-3"
      >
        <span
          >{{ entry.action.toLowerCase().replaceAll("_", " ")
          }}<small
            v-if="entry.actorName || entry.telegramUserId"
            class="mt-1 block text-xs text-slate-500"
            >{{
              entry.actorName || "Telegram member " + entry.telegramUserId
            }}</small
          ></span
        ><time class="text-xs text-slate-500">{{
          new Date(entry.createdAt).toLocaleString()
        }}</time>
      </li>
    </ul>
    <p v-if="!activity.items.length" class="text-sm text-slate-500">
      No group changes yet.
    </p>
    <div class="flex gap-4 text-sm">
      <button
        v-if="activity.page > 1"
        class="underline"
        @click="$emit('activityPage', activity.page - 1)"
      >
        Previous</button
      ><button
        v-if="activity.items.length === 20"
        class="underline"
        @click="$emit('activityPage', activity.page + 1)"
      >
        Next
      </button>
    </div>
    <template v-if="history"
      ><h3
        class="border-t border-slate-100 pt-4 text-sm font-semibold dark:border-slate-800"
      >
        Voting history
      </h3>
      <p v-for="round in history.items" :key="round.id" class="text-sm">
        {{ round.voteDate.slice(0, 10) }} ·
        {{ round.finalizedAt ? "Closed" : "Round in progress" }}
      </p>
      <p v-if="!history.items.length" class="text-sm text-slate-500">
        No rounds yet.
      </p>
      <div class="flex gap-4 text-sm">
        <button
          v-if="history.page > 1"
          class="underline"
          @click="$emit('historyPage', history.page - 1)"
        >
          Previous rounds</button
        ><button
          v-if="history.items.length === 20"
          class="underline"
          @click="$emit('historyPage', history.page + 1)"
        >
          More rounds
        </button>
      </div></template
    >
  </section>
</template>
