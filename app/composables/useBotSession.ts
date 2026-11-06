import { useAppI18n } from "~/composables/useAppI18n";
import {
  groupApi,
  type BotSession,
  type BotKind,
} from "~/services/group-workspaces.service";
export type BotSessionState =
  "loading" | "ready" | "pending" | "error" | "outside-telegram";


export function useBotSession() {
  const { t } = useAppI18n();
  const auth = useAuth();
  const state = useState<BotSessionState>("bot:state", () => "loading");
  const session = useState<BotSession | null>("bot:session", () => null);
  const bot = useState<BotKind>("bot:kind", () => "CHLATWORK");
  const epoch = useState("bot:epoch", () => 0);
  const identity = useState<string | null>("bot:identity", () => null);
  const error = useState("bot:error", () => "");
  const managerStatus = computed(
    () => session.value?.managerStatus ?? "NOT_REQUESTED",
  );
  function clear() {
    epoch.value++;
    session.value = null;
    identity.value = null;
    state.value = "error";
  }
  async function initialize(kind: BotKind = bot.value) {
    const version = ++epoch.value;
    session.value = null;
    identity.value = null;
    error.value = "";
    state.value = "loading";
    bot.value = kind;
    const telegram = getTelegramMiniApp();
    if (!telegram?.initData) {
      state.value = "outside-telegram";
      return;
    }
    try {
      const user = await auth.loginWithTelegram(
        telegram.initData,
        () => version === epoch.value,
      );
      if (version !== epoch.value) return;
      identity.value = user.id;
      const result = await groupApi.session(kind);
      if (version !== epoch.value || auth.user.value?.id !== user.id) return;
      session.value = result;
      state.value =
        result.managerStatus === "APPROVED" && result.enabled
          ? "ready"
          : "pending";
    } catch {
      if (version === epoch.value) {
        clear();
        error.value =
          "shared.bot_session.your_telegram_session_could_not_be_verified_reopen_the";
      }
    }
  }
  async function requestManagerAccess() {
    const version = epoch.value;
    const kind = bot.value;
    if (!identity.value || state.value !== "pending") return;
    try {
      await groupApi.requestManager(kind);
      if (version === epoch.value) await initialize(kind);
    } catch {
      if (version === epoch.value)
        error.value = "shared.bot_session.could_not_request_approval_please_try_again";
    }
  }
  watch(
    () => auth.user.value?.id,
    (id) => {
      if (identity.value && id !== identity.value) clear();
    },
  );
  return {
    state,
    session,
    user: auth.user,
    managerStatus,
    bot,
    epoch,
    error: computed(() => error.value ? t(error.value) : ""),
    initialize,
    requestManagerAccess,
    clear,
  };
}
