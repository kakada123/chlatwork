<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import { groupApi } from "~/services/group-workspaces.service";

const { t } = useAppI18n();

const { isKhmer } = useLanguage();
const { bot, state, epoch } = useBotSession();
let active = true;
onBeforeUnmount(() => {
  active = false;
});
const busy = ref(false);
const error = ref("");
async function connect() {
  if (state.value !== "ready" || busy.value) return;
  const version = epoch.value;
  busy.value = true;
  error.value = "";
  try {
    const result = await groupApi.connect(bot.value);
    if (active && version === epoch.value && state.value === "ready")
      await navigateTo(result.deepLink, { external: true });
  } catch {
    if (active && version === epoch.value)
      error.value = t("shared.components_bot_group_connect.could_not_create_a_connection_link_try_again");
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div>
    <button
      :disabled="busy"
      class="rounded-xl bg-violet-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
      @click="connect"
    >
      {{ busy ? t("shared.components_bot_group_connect.opening_telegram") : t("shared.components_bot_group_connect.connect_a_group") }}
    </button>
    <p v-if="error" role="alert" class="mt-2 text-sm text-rose-600">
      {{ error }}
    </p>
  </div>
</template>
