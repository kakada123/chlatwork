<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";

const { t } = useAppI18n();
const { isKhmer } = useLanguage();
const emit = defineEmits<{ login: [] }>();
const showLogin = ref(false);

function openLogin() {
  emit('login');
  showLogin.value = true;
}
</script>

<template>
  <section class="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 p-6 text-center dark:border-cyan-300/25 dark:bg-cyan-300/10">
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-xl text-white" aria-hidden="true">🔒</div>
    <h2 class="mt-4 text-xl font-semibold">{{ t("shared.components_auth_result_auth_gate.sign_in_to_view_your_result") }}</h2>
    <p class="mt-2 max-w-md text-sm text-gray-600 dark:text-white/65">
      {{ t("shared.components_auth_result_auth_gate.your_current_input_stays_on_this_page_after_google") }}
    </p>
    <button type="button" class="mt-5 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700" @click="openLogin">
      {{ t("shared.components_auth_result_auth_gate.continue_to_login") }}
    </button>
    <AuthLoginDialog :open="showLogin" @close="showLogin = false" />
  </section>
</template>
