import { getAuthErrorMessage } from "~/composables/useAuth";
import type { TaskMutate } from "~/lib/work-tasks";
export function useTasksClient() {
  const { user } = useAuth(),
    { t } = useAppI18n();
  const owner = computed(() => user.value?.id),
    timeZone = ref("Asia/Phnom_Penh"),
    error = ref(""),
    feedback = ref(""),
    busy = ref(false);
  let generation = 0;
  watch(
    owner,
    () => {
      generation++;
      error.value = "";
      feedback.value = "";
    },
    { flush: "sync" },
  );
  onBeforeUnmount(() => generation++);
  async function request<T>(
    path: string,
    options: {
      method?: "GET" | "POST" | "PATCH" | "DELETE";
      body?: Record<string, unknown> | FormData;
      query?: Record<string, unknown>;
    } = {},
  ) {
    const version = generation;
    if (!owner.value) throw new Error(t("tasks.error"));
    const result = await $fetch<T>("/api/tasks" + path, options);
    if (version !== generation) throw new Error(t("tasks.error"));
    return result as T;
  }
  function fail(e: unknown) {
    error.value = getAuthErrorMessage(e) || t("tasks.error");
  }
  const mutate: TaskMutate = async <T>(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown> | FormData,
  ) => {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    feedback.value = "";
    try {
      const result = await request<T>(path, {
        method,
        ...(body === undefined ? {} : { body }),
      });
      feedback.value = path.endsWith("/preview") ? "" : t("tasks.saved");
      return result;
    } catch (e) {
      fail(e);
      return undefined;
    } finally {
      busy.value = false;
    }
  };
  function date(value: string | null | undefined) {
    return value
      ? new Intl.DateTimeFormat(undefined, {
          timeZone: timeZone.value,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(value))
      : t("tasks.noDate");
  }
  return {
    owner,
    timeZone,
    error,
    feedback,
    busy,
    request,
    mutate,
    fail,
    date,
  };
}
