<script setup lang="ts">
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

const emit = defineEmits<{ success: []; error: [message: string] }>();
const config = useRuntimeConfig();
const { loginWithGoogle, startTelegramCodeLogin } = useAuth();
const googleButton = ref<HTMLElement | null>(null);
const googleClientId = computed(() => config.public.googleClientId);
const telegramClientId = computed(() => config.public.telegramClientId);

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
    script.onerror = () => reject(new Error("Unable to load social login"));
    document.head.appendChild(script);
  });
}

onMounted(async () => {
  if (!googleClientId.value || !googleButton.value) return;
  try {
    await loadScript("google-identity-services", "https://accounts.google.com/gsi/client");
    window.google?.accounts.id.initialize({
      client_id: googleClientId.value,
      callback: async ({ credential }) => {
        if (!credential) return emit("error", "Google did not return an ID token");
        try {
          await loginWithGoogle(credential);
          emit("success");
        } catch (error) {
          emit("error", getAuthErrorMessage(error));
        }
      },
    });
    window.google?.accounts.id.renderButton(googleButton.value, {
      theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320,
    });
  } catch (error) {
    emit("error", getAuthErrorMessage(error));
  }
});
</script>

<template>
  <div class="mt-6 space-y-3">
    <div class="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
      <span class="h-px flex-1 bg-gray-200 dark:bg-white/15" />
      Or continue with
      <span class="h-px flex-1 bg-gray-200 dark:bg-white/15" />
    </div>
    <div v-if="googleClientId" ref="googleButton" class="flex min-h-11 justify-center overflow-hidden rounded-full" />
    <button
      v-else
      type="button"
      disabled
      class="h-11 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 font-semibold text-gray-500 opacity-70 dark:border-white/20 dark:bg-white/5 dark:text-gray-400"
    >
      Google login is not configured
    </button>
    <button
      v-if="telegramClientId"
      type="button"
      class="h-11 w-full rounded-xl border border-sky-300 bg-sky-50 font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-300"
      @click="startTelegramCodeLogin"
    >
      Continue with Telegram
    </button>
    <button
      v-else
      type="button"
      disabled
      class="h-11 w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 font-semibold text-gray-500 opacity-70 dark:border-white/20 dark:bg-white/5 dark:text-gray-400"
    >
      Telegram login is not configured
    </button>
  </div>
</template>
