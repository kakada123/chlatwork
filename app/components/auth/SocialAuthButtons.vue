<script setup lang="ts">
import { useAppI18n } from "~/composables/useAppI18n";
import type { AppLocale } from "~/composables/useLanguage";
import { useLanguage } from "~/composables/useLanguage";


const { isKhmer } = useLanguage();

interface GoogleCredentialResponse { credential?: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }): void;
          renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
        };
      };
    };
  }
}

const { currentLocale } = useLanguage();
const props = defineProps<{ locale?: AppLocale }>();
const activeLocale = computed(() => props.locale ?? currentLocale.value);
const { t } = useAppI18n(activeLocale);
const emit = defineEmits<{ success: []; error: [message: string] }>();
const config = useRuntimeConfig();
const { loginWithGoogle, loginWithTelegram, startTelegramCodeLogin } = useAuth();
const googleButton = ref<HTMLElement | null>(null);
const googleClientId = computed(() => config.public.googleClientId);
const telegramClientId = computed(() => config.public.telegramClientId);
const isMiniAppAuthenticating = ref(false);
const authCopy = computed(() =>
  ({ divider: t("shared.copy_app_components_auth_SocialAuthButtons_vue.or_continue_with"), googleMissing: t("shared.copy_app_components_auth_SocialAuthButtons_vue.google_login_is_not_configured"), telegram: t("shared.copy_app_components_auth_SocialAuthButtons_vue.continue_with_telegram"), telegramMissing: t("shared.copy_app_components_auth_SocialAuthButtons_vue.telegram_login_is_not_configured"), loadError: t("shared.copy_app_components_auth_SocialAuthButtons_vue.unable_to_load_social_login"), tokenError: t("shared.copy_app_components_auth_SocialAuthButtons_vue.google_did_not_return_an_id_token"), loginError: t("shared.copy_app_components_auth_SocialAuthButtons_vue.unable_to_sign_in_please_try_again") }),
);

function loadScript(id: string, src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) return resolve();
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(authCopy.value.loadError));
    document.head.appendChild(script);
  });
}

function getSocialAuthError(error: unknown) {
  return activeLocale.value === "km"
    ? authCopy.value.loginError
    : getAuthErrorMessage(error);
}

async function startTelegramLogin() {
  try {
    await startTelegramCodeLogin();
  } catch (error) {
    emit("error", getSocialAuthError(error));
  }
}

onMounted(async () => {
  const telegram = getTelegramMiniApp();
  if (telegram?.initData) {
    isMiniAppAuthenticating.value = true;
    telegram.ready();
    try {
      await loginWithTelegram(telegram.initData);
      emit("success");
    } catch (error) {
      emit("error", getSocialAuthError(error));
    } finally {
      isMiniAppAuthenticating.value = false;
    }
    return;
  }
  if (!googleClientId.value || !googleButton.value) return;
  try {
    await loadScript("google-identity-services", "https://accounts.google.com/gsi/client");
    window.google?.accounts.id.initialize({
      client_id: googleClientId.value,
      callback: async ({ credential }) => {
        if (!credential) return emit("error", authCopy.value.tokenError);
        try {
          await loginWithGoogle(credential);
          emit("success");
        } catch (error) {
          emit("error", getSocialAuthError(error));
        }
      },
    });
    window.google?.accounts.id.renderButton(googleButton.value, {
      theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320, locale: activeLocale.value,
    });
  } catch (error) {
    emit("error", getSocialAuthError(error));
  }
});
</script>

<template>
  <div class="mt-6 space-y-3">
    <p v-if="isMiniAppAuthenticating" role="status" class="rounded-xl bg-sky-50 px-4 py-3 text-center text-sm font-semibold text-sky-700 dark:bg-cyan-300/10 dark:text-cyan-200">
      {{ t("shared.components_auth_social_auth_buttons.verifying_your_telegram_account") }}
    </p>
    <template v-else>
    <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
      <span class="h-px flex-1 bg-gray-200 dark:bg-white/15" />
      {{ authCopy.divider }}
      <span class="h-px flex-1 bg-gray-200 dark:bg-white/15" />
    </div>
    <div v-if="googleClientId" ref="googleButton" class="flex min-h-11 justify-center overflow-hidden rounded-full" />
    <button
      v-else
      type="button"
      disabled
      class="h-11 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 font-semibold text-gray-500 opacity-70 dark:border-white/20 dark:bg-white/5 dark:text-gray-400"
    >
      {{ authCopy.googleMissing }}
    </button>
    <button
      v-if="telegramClientId"
      type="button"
      class="h-11 w-full rounded-xl border border-sky-300 bg-sky-50 font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300"
      @click="startTelegramLogin"
    >
      {{ authCopy.telegram }}
    </button>
    <button
      v-else
      type="button"
      disabled
      class="h-11 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 font-semibold text-gray-500 opacity-70 dark:border-white/20 dark:bg-white/5 dark:text-gray-400"
    >
      {{ authCopy.telegramMissing }}
    </button>
    </template>
  </div>
</template>
