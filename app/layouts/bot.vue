<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { BotKind } from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer, languageLabel, switchLanguage } = useLanguage();
const route = useRoute();
const { state, bot, error, initialize, session, requestManagerAccess } =
  useBotSession();
const kind = () => (route.query.bot === "CREATOR" ? "CREATOR" : "CHLATWORK");
onMounted(() => initialize(kind()));
watch(
  () => route.query.bot,
  () => initialize(kind()),
);
useSeoMeta({ title: () => t("shared.layouts_bot.my_groups_chlat_work"), robots: "noindex, nofollow" });
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
          >{{ t("shared.layouts_bot.my_groups") }}</NuxtLink
        >
        <nav class="flex items-center gap-4 text-sm">
          <button type="button" class="min-h-11 font-semibold" :aria-label="languageLabel" @click="switchLanguage">{{ languageLabel }}</button>
          <NuxtLink :to="{ path: '/bot/account', query: { bot } }"
            >{{ t("shared.pages_bot_account.my_account") }}</NuxtLink
          ><ModernSelect
            :aria-label="t(&quot;shared.components_bot_group_overview.bot&quot;)"
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
          </ModernSelect>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <p
        v-if="state === 'loading'"
        role="status"
        class="py-12 text-center text-slate-500"
      >
        {{ t("shared.components_auth_social_auth_buttons.verifying_your_telegram_account") }}
      </p>
      <section
        v-else-if="state === 'outside-telegram'"
        class="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900"
      >
        <h1 class="text-xl font-semibold">{{ t("shared.layouts_bot.open_this_page_from_telegram") }}</h1>
        <p class="mt-3 text-slate-500">
          {{ t("shared.layouts_bot.send_groups_privately_to_the_chlat_work_or_creator") }}
        </p>
      </section>
      <section
        v-else-if="state === 'error'"
        class="rounded-2xl bg-white p-6 dark:bg-slate-900"
      >
        <p role="alert">
          {{
            error || t("shared.layouts_bot.your_session_ended_verify_your_telegram_account_again")
          }}
        </p>
        <button
          class="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-white"
          @click="initialize(bot)"
        >
          {{ t("shared.common.try_again") }}
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
                ? t("shared.layouts_bot.manage_your_telegram_groups")
                : session?.managerStatus === "PENDING"
                  ? t("shared.layouts_bot.waiting_for_manager_approval")
                  : t("shared.layouts_bot.manager_access_unavailable")
            }}
          </h1>
          <p class="mt-2 text-sm">
            {{ t("shared.layouts_bot.group_members_can_use_free_features_in_connected_groups") }}
          </p>
          <button
            v-if="session?.managerStatus === 'NOT_REQUESTED'"
            class="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-white"
            @click="requestManagerAccess"
          >
            {{ t("shared.layouts_bot.request_manager_approval") }}
          </button>
          <button
            v-else-if="session?.managerStatus === 'PENDING'"
            class="mt-4 underline"
            @click="initialize(bot)"
          >
            {{ t("shared.layouts_bot.check_approval") }}
          </button>
        </section>
        <p v-if="error" role="alert" class="text-rose-600">{{ error }}</p>
        <slot />
      </template>
    </main>
  </div>
</template>
