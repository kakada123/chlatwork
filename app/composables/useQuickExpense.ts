import { useAuth } from "~/composables/useAuth";
import type { ExpenseCurrency } from "~/lib/expense-tracker";

type QuickExpenseSettings = {
  enabled: boolean;
  currency: ExpenseCurrency;
};

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

  return {
    currency,
    enabled,
    isLoading,
    refreshSettings,
    syncSettings,
  };
}
