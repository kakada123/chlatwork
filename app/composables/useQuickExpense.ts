import { useAuth } from "~/composables/useAuth";
import type { ExpenseCurrency } from "~/lib/expense-tracker";

type QuickExpenseSettings = {
  enabled: boolean;
  currency: ExpenseCurrency;
};

export const QUICK_EXPENSE_OPEN_EVENT = "chlatwork:open-quick-expense";

export function openQuickExpense() {
  if (!import.meta.client) return;
  window.dispatchEvent(new Event(QUICK_EXPENSE_OPEN_EVENT));
}

export function useQuickExpense() {
  const { user } = useAuth();
  const enabled = useState<boolean | null>("quick-expense-enabled", () => null);
  const currency = useState<ExpenseCurrency>("quick-expense-currency", () => "USD");
  const loadedForUserId = useState<string | null>("quick-expense-user", () => null);
  const isLoading = useState<boolean>("quick-expense-loading", () => false);

  function syncSettings(settings: QuickExpenseSettings) {
    enabled.value = settings.enabled;
    currency.value = settings.currency;
    loadedForUserId.value = user.value?.id ?? null;
  }

  async function refreshSettings(force = false) {
    const userId = user.value?.id;
    if (!userId) {
      enabled.value = null;
      loadedForUserId.value = null;
      return;
    }

    if ((!force && loadedForUserId.value === userId) || isLoading.value) return;

    isLoading.value = true;
    try {
      const settings = await $fetch<QuickExpenseSettings>(
        "/api/expenses/quick-entry/settings",
      );
      syncSettings(settings);
    } catch {
      // A failed preference lookup must never expose a control that cannot save.
      enabled.value = false;
      loadedForUserId.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateEnabled(nextEnabled: boolean) {
    const settings = await $fetch<QuickExpenseSettings>(
      "/api/expenses/quick-entry/settings",
      {
        method: "PUT",
        body: { enabled: nextEnabled },
      },
    );
    syncSettings(settings);
    return settings;
  }

  return {
    currency,
    enabled,
    isLoading,
    refreshSettings,
    syncSettings,
    updateEnabled,
  };
}
