import type { AuthUser } from "~/composables/useAuth";

export function useTelegramPhone() {
  const { user } = useAuth();
  const available = ref(false);
  const saving = ref(false);
  const error = ref("");
  const status = ref("");
  const enabled = computed(() => Boolean(user.value?.phone));
  const disabled = computed(() => saving.value || (!enabled.value && !available.value));
  const description = computed(() => {
    if (saving.value) return "Waiting for phone sharing…";
    if (enabled.value) return "Saved to your profile. Turn off to remove it from ChlatWork.";
    if (!available.value) return "Optional — open ChlatWork in Telegram to share your phone.";
    return "Optional — share your Telegram phone number with ChlatWork.";
  });
  let disposed = false;

  onMounted(() => {
    const telegram = getTelegramMiniApp();
    available.value = Boolean(telegram?.initData
      && typeof telegram.requestContact === "function"
      && user.value?.providers.includes("TELEGRAM"));
  });
  onScopeDispose(() => { disposed = true; });

  async function toggle() {
    if (disabled.value || !user.value) return;
    const accountId = user.value.id;
    saving.value = true;
    error.value = "";
    status.value = "";
    let permissionTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      if (enabled.value) {
        await $fetch("/api/auth/phone", { method: "DELETE" });
        if (!disposed && user.value?.id === accountId) {
          user.value = { ...user.value, phone: null };
          status.value = "Phone number removed from ChlatWork. Telegram keeps its own copy.";
        }
        return;
      }
      const telegram = getTelegramMiniApp();
      if (!telegram?.requestContact) throw new Error("Contact sharing unavailable");
      // Open native consent directly from the click; its boolean is not proof
      // that the webhook has saved a phone to this signed-in account.
      const shared = await new Promise<boolean>((resolve, reject) => {
        permissionTimeout = setTimeout(() => reject(new Error("Contact sharing timed out")), 60_000);
        telegram.requestContact!(resolve);
      });
      if (disposed || user.value?.id !== accountId) return;
      if (!shared) {
        status.value = "Phone sharing skipped. You can keep using ChlatWork.";
        return;
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        if (disposed || user.value?.id !== accountId) return;
        const response = await $fetch<{ user: AuthUser }>("/api/auth/me", { timeout: 5_000 });
        if (disposed || user.value?.id !== accountId || response.user.id !== accountId) return;
        if (response.user.phone) {
          user.value = response.user;
          status.value = "Phone number saved to your ChlatWork profile.";
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      status.value = "Phone sharing is not confirmed yet. Refresh this page shortly to check.";
    } catch {
      if (!disposed) error.value = "Could not update phone sharing. Please refresh and try again.";
    } finally {
      if (permissionTimeout) clearTimeout(permissionTimeout);
      saving.value = false;
    }
  }

  return { enabled, disabled, description, error, status, toggle };
}
