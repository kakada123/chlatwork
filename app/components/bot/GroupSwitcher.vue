<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { GroupSummary } from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
defineProps<{ groups: GroupSummary[]; selected?: string }>();
</script>
<template>
  <nav :aria-label="t(&quot;shared.components_bot_group_switcher.my_groups&quot;)" class="flex gap-2 overflow-x-auto pb-1">
    <NuxtLink
      v-for="group in groups"
      :key="group.workspaceId"
      :to="{
        path: `/bot/groups/${group.workspaceId}`,
        query: { bot: group.bot },
      }"
      class="whitespace-nowrap rounded-xl border px-3 py-2 text-sm"
      :class="
        selected === group.workspaceId
          ? 'border-violet-500 bg-violet-50 text-violet-700'
          : 'border-slate-200 dark:border-slate-700'
      "
      >{{ group.title }}</NuxtLink
    >
  </nav>
</template>
