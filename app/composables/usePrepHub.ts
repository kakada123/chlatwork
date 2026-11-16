import { getAuthErrorMessage } from "~/composables/useAuth";
/** Requests belong to the account that started them; a late response cannot repopulate another account's screen. */
export function usePrepHub() {
  const { user } = useAuth();
  const { t } = useAppI18n();
  const owner = computed(() => user.value?.id);
  const timeZone = ref("Asia/Phnom_Penh");
  const error = ref("");
  const busy = ref(false);
  const feedback = ref("");
  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
      body?: Record<string, unknown> | FormData;
      query?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    const startedOwner = owner.value;
    if (!startedOwner) throw new Error(t("prephub.error"));
    const result = await $fetch<T>(`/api/prephub${path}`, options);
    if (owner.value !== startedOwner) throw new Error(t("prephub.error"));
    return result as T;
  }
  function fail(e: unknown) {
    error.value = getAuthErrorMessage(e) || t("prephub.saveError");
  }
  function date(value: string | null) {
    return value
      ? new Intl.DateTimeFormat(undefined, {
          timeZone: timeZone.value,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : t("prephub.noSchedule");
  }
  return { owner, timeZone, request, error, busy, feedback, fail, date };
}
