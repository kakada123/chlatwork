<script setup lang="ts">
import type { GroupDetails } from "~/services/group-workspaces.service";
defineProps<{ group: GroupDetails }>();
</script>
<template>
  <section class="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <h2 class="font-semibold">Group overview</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-slate-500">Bot</dt>
        <dd class="mt-1">
          {{ group.bot === "CREATOR" ? "Creator" : "ChlatWork" }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">Connection</dt>
        <dd class="mt-1">
          {{
            group.health === "CONNECTED" ? "Connected" : "Needs reconnection"
          }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">Access</dt>
        <dd class="mt-1">{{ group.enabled ? "Enabled" : "Paused" }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">Voting schedule</dt>
        <dd class="mt-1">
          {{ group.poll?.schedule?.enabled ? "Daily" : "Off" }}
        </dd>
      </div>
    </dl>
    <p class="mt-4 text-sm text-slate-500">
      Group members can use enabled free features. AI requests use each person’s
      own approved account and credits.
    </p>
    <div v-if="group.health !== 'CONNECTED'" class="mt-4">
      <BotGroupConnect />
    </div>
  </section>
</template>
