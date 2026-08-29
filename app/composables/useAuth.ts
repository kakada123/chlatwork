export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  providers: Array<"GOOGLE" | "TELEGRAM">;
}

interface AuthUserResponse {
  user: AuthUser;
}

const fetchMeRequests = new WeakMap<object, Promise<AuthUser | null>>();

export function getAuthErrorMessage(error: unknown) {
  const fetchError = error as {
    data?: { message?: string | string[]; statusMessage?: string };
    statusMessage?: string;
    message?: string;
  };
  const message =
    fetchError.data?.message ??
    fetchError.data?.statusMessage ??
    fetchError.statusMessage ??
    fetchError.message;

  return Array.isArray(message)
    ? message.join(", ")
    : message || "Authentication failed. Please try again.";
}

export function useAuth() {
  const nuxtApp = useNuxtApp();
  const user = useState<AuthUser | null>("auth:user", () => null);
  const isReady = useState("auth:is-ready", () => false);

  function fetchMe() {
    const activeRequest = fetchMeRequests.get(nuxtApp);
    if (activeRequest) return activeRequest;

    // Layouts and pages can resolve auth together during startup; share one request per Nuxt app.
    const request = (async () => {
      try {
        const headers = import.meta.server ? useRequestHeaders(["cookie"]) : {};
        const response = await $fetch<AuthUserResponse>("/api/auth/me", { headers });
        user.value = response.user;
        return response.user;
      } catch {
        user.value = null;
        return null;
      } finally {
        isReady.value = true;
        if (fetchMeRequests.get(nuxtApp) === request) {
          fetchMeRequests.delete(nuxtApp);
        }
      }
    })();

    fetchMeRequests.set(nuxtApp, request);
    return request;
  }

  async function loginWithGoogle(token: string) {
    const response = await $fetch<AuthUserResponse>("/api/auth/google", {
      method: "POST",
      body: { token },
    });
    user.value = response.user;
    isReady.value = true;
    return response.user;
  }

  async function loginWithTelegram(initData: string) {
    const response = await $fetch<AuthUserResponse>("/api/auth/telegram", {
      method: "POST",
      body: { initData },
    });
    user.value = response.user;
    isReady.value = true;
    return response.user;
  }

  async function startTelegramCodeLogin() {
    await navigateTo("/api/auth/telegram/start", { external: true });
  }

  async function logout() {
    await $fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    user.value = null;
    isReady.value = true;
  }

  return {
    user,
    isReady,
    fetchMe,
    loginWithGoogle,
    loginWithTelegram,
    startTelegramCodeLogin,
    logout,
  };
}
