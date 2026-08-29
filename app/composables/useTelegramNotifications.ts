export interface TelegramNotificationSettings {
  available: boolean;
  enabled: boolean;
}

export function useTelegramNotifications() {
  const settings = ref<TelegramNotificationSettings | null>(null);
  const isLoading = ref(false);

  async function load() {
    isLoading.value = true;
    try {
      settings.value = await $fetch<TelegramNotificationSettings>(
        "/api/notifications/telegram/settings",
      );
      return settings.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function update(enabled: boolean, initData?: string) {
    settings.value = await $fetch<TelegramNotificationSettings>(
      "/api/notifications/telegram/settings",
      {
        method: "PUT",
        body: { enabled, ...(initData ? { initData } : {}) },
      },
    );
    return settings.value;
  }

  return { settings, isLoading, load, update };
}
