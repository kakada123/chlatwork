export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

interface AuthUserResponse {
  user: AuthUser;
}

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
  const user = useState<AuthUser | null>("auth:user", () => null);
  const isReady = useState("auth:is-ready", () => false);

  async function fetchMe() {
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
    }
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

  async function loginWithTelegram(idToken: string) {
    const response = await $fetch<AuthUserResponse>("/api/auth/telegram", {
      method: "POST",
      body: { idToken },
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
