<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { GroupDetails } from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
defineProps<{ group: GroupDetails }>();
</script>
<template>
  <section class="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
    <h2 class="font-semibold">{{ t("shared.components_bot_group_overview.group_overview") }}</h2>
    <dl class="mt-4 grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-slate-500">{{ t("shared.components_bot_group_overview.bot") }}</dt>
        <dd class="mt-1">
          {{ group.bot === "CREATOR" ? "Creator" : "ChlatWork" }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t("shared.components_bot_group_overview.connection") }}</dt>
        <dd class="mt-1">
          {{
            group.health === "CONNECTED" ? t("shared.components_bot_group_overview.connected") : t("shared.components_bot_group_overview.needs_reconnection")
          }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t("shared.components_bot_group_overview.access") }}</dt>
        <dd class="mt-1">{{ group.enabled ? t("shared.common.enabled") : t("shared.components_bot_group_overview.paused") }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t("shared.components_bot_group_overview.voting_schedule") }}</dt>
        <dd class="mt-1">
          {{ group.poll?.schedule?.enabled ? t("shared.components_bot_group_overview.daily") : t("shared.components_bot_group_overview.off") }}
        </dd>
      </div>
    </dl>
    <p class="mt-4 text-sm text-slate-500">
      {{ t("shared.components_bot_group_overview.group_members_can_use_enabled_free_features_ai_requests") }}
    </p>
    <div v-if="group.health !== 'CONNECTED'" class="mt-4">
      <BotGroupConnect />
    </div>
  </section>
</template>
