<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { localizeBotCode } from "~/lib/bot-ui-copy";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();
definePageMeta({ layout: "bot" });
const { session, user, state, bot } = useBotSession();
const qrLink = computed(() =>
  session.value?.botUsername
    ? `https://t.me/${session.value.botUsername}?start=myqr`
    : null,
);
</script>
<template>
  <section
    v-if="session && ['ready', 'pending'].includes(state)"
    class="space-y-5 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"
  >
    <h1 class="text-2xl font-bold">{{ t("shared.pages_bot_account.my_account") }}</h1>
    <p>{{ user?.name || t("shared.pages_bot_account.telegram_member") }}</p>
    <dl class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <dt class="text-slate-500">{{ t("shared.pages_bot_account.manager_status") }}</dt>
        <dd class="mt-1">
          {{ localizeBotCode(session.managerStatus, t("shared.components_admin_bot_group_workspaces.en")).toLowerCase().replaceAll("_", " ") }}
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t("shared.pages_bot_account.shared_ai_credits") }}</dt>
        <dd class="mt-1 text-xl font-semibold">{{ session.balance }}</dd>
      </div>
    </dl>
    <p class="text-sm text-slate-500">
      {{ t("shared.pages_bot_account.creator_and_chlat_work_use_this_personal_balance_ai") }}
    </p>
    <a
      v-if="qrLink"
      :href="qrLink"
      class="inline-block rounded-xl bg-violet-600 px-4 py-2 text-white"
      >{{ t("shared.pages_bot_account.manage_my_khqr_privately") }}</a
    >
    <p class="text-sm text-slate-500">
      {{ t("shared.pages_bot_account.upload_preview_and_confirm_your_khqr_in_the_bot") }}
    </p>
    <NuxtLink
      :to="{ path: '/bot/groups', query: { bot } }"
      class="block text-sm text-violet-600"
      >{{ t("shared.pages_bot_account.back_to_my_groups") }}</NuxtLink
    >
  </section>
</template>
