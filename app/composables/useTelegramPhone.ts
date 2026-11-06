import { useAppI18n } from "~/composables/useAppI18n";
import type { AuthUser } from "~/composables/useAuth";



export function useTelegramPhone() {
  const { t } = useAppI18n();
  const { user } = useAuth();
  const available = ref(false);
  const saving = ref(false);
  const error = ref("");
  const status = ref("");
  const enabled = computed(() => Boolean(user.value?.phone));
  const disabled = computed(() => saving.value || (!enabled.value && !available.value));
  const description = computed(() => {
    if (saving.value) return t("shared.telegram_phone.waiting_for_phone_sharing");
    if (enabled.value) return t("shared.telegram_phone.saved_to_your_profile_turn_off_to_remove_it");
    if (!available.value) return t("shared.telegram_phone.optional_open_chlat_work_in_telegram_to_share_your");
    return t("shared.telegram_phone.optional_share_your_telegram_phone_number_with_chlat_work");
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
          status.value = "shared.telegram_phone.phone_number_removed_from_chlat_work_telegram_keeps_its";
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
        status.value = "shared.telegram_phone.phone_sharing_skipped_you_can_keep_using_chlat_work";
        return;
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        if (disposed || user.value?.id !== accountId) return;
        const response = await $fetch<{ user: AuthUser }>("/api/auth/me", { timeout: 5_000 });
        if (disposed || user.value?.id !== accountId || response.user.id !== accountId) return;
        if (response.user.phone) {
          user.value = response.user;
          status.value = "shared.telegram_phone.phone_number_saved_to_your_chlat_work_profile";
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      status.value = "shared.telegram_phone.phone_sharing_is_not_confirmed_yet_refresh_this_page";
    } catch {
      if (!disposed) error.value = "shared.telegram_phone.could_not_update_phone_sharing_please_refresh_and_try";
    } finally {
      if (permissionTimeout) clearTimeout(permissionTimeout);
      saving.value = false;
    }
  }

  return {
    enabled, disabled, description,
    error: computed(() => error.value ? t(error.value) : ""),
    status: computed(() => status.value ? t(status.value) : ""),
    toggle,
  };
}
