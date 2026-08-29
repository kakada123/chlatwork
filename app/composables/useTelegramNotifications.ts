export interface TelegramNotificationSettings {
  available: boolean;
  enabled: boolean;
  timeZone: string;
  dailyExpenseSummaryHour: number;
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

  async function update(enabled: boolean, initData?: string, timeZone?: string) {
    settings.value = await $fetch<TelegramNotificationSettings>(
      "/api/notifications/telegram/settings",
      {
        method: "PUT",
        body: {
          enabled,
          ...(initData ? { initData } : {}),
          ...(timeZone ? { timeZone } : {}),
        },
      },
    );
    return settings.value;
  }

  return { settings, isLoading, load, update };
}
