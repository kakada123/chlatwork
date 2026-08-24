import {
  createError,
  deleteCookie,
  getCookie,
  getHeader,
  readBody,
  setCookie,
  type H3Event,
} from "h3";

const ACCESS_TOKEN_COOKIE = "chlatwork_access_token";
const REFRESH_TOKEN_COOKIE = "chlatwork_refresh_token";
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: string;
}

export interface AuthTokenResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

function cookieOptions(event: H3Event, maxAge: number) {
  const forwardedProto = getHeader(event, "x-forwarded-proto")?.split(",")[0]?.trim();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: forwardedProto === "https",
    path: "/",
    maxAge,
  };
}

function apiBaseUrl(event: H3Event) {
  const value = useRuntimeConfig(event).authApiBaseUrl;
  if (!value) {
    throw createError({ statusCode: 503, statusMessage: "Authentication service is not configured" });
  }
  return value.replace(/\/$/, "");
}

export async function readAuthBody<T>(event: H3Event) {
  return await readBody<T>(event);
}

export async function requestAuthApi<T>(
  event: H3Event,
  path: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
  try {
    return (await $fetch(`${apiBaseUrl(event)}${path}`, options)) as T;
  } catch (error) {
    const fetchError = error as {
      statusCode?: number;
      response?: { status?: number; _data?: ApiErrorBody };
    };
    if (fetchError.statusCode && !fetchError.response) {
      throw error;
    }
    const body = fetchError.response?._data;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message || body?.error || "Authentication request failed";
    throw createError({ statusCode: fetchError.response?.status ?? 502, statusMessage: message });
  }
}

export const getAccessToken = (event: H3Event) => getCookie(event, ACCESS_TOKEN_COOKIE);
export const getRefreshToken = (event: H3Event) => getCookie(event, REFRESH_TOKEN_COOKIE);

export function setAuthCookies(event: H3Event, tokens: AuthTokenResponse) {
  // Tokens remain inaccessible to client-side scripts; the Nuxt server owns refresh and forwarding.
  setCookie(event, ACCESS_TOKEN_COOKIE, tokens.accessToken, cookieOptions(event, ACCESS_TOKEN_MAX_AGE));
  setCookie(event, REFRESH_TOKEN_COOKIE, tokens.refreshToken, cookieOptions(event, REFRESH_TOKEN_MAX_AGE));
}

export function clearAuthCookies(event: H3Event) {
  deleteCookie(event, ACCESS_TOKEN_COOKIE, { path: "/" });
  deleteCookie(event, REFRESH_TOKEN_COOKIE, { path: "/" });
}

export async function refreshAuthCookies(event: H3Event) {
  const refreshToken = getRefreshToken(event);
  if (!refreshToken) return null;

  const tokens = await requestAuthApi<AuthTokenResponse>(event, "/auth/refresh", {
    method: "POST",
    body: { refreshToken },
  });
  setAuthCookies(event, tokens);
  return tokens;
}

export async function requestAuthenticatedApi<T>(
  event: H3Event,
  path: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
): Promise<T> {
  let accessToken = getAccessToken(event);

  if (!accessToken) {
    const refreshed = await refreshAuthCookies(event).catch(() => null);
    accessToken = refreshed?.accessToken;
  }

  if (!accessToken) {
    clearAuthCookies(event);
    throw createError({ statusCode: 401, statusMessage: "Authentication required" });
  }

  const send = (token: string) => {
    const headers = new Headers(options.headers as HeadersInit | undefined);
    headers.set("Authorization", `Bearer ${token}`);
    return requestAuthApi<T>(event, path, {
      ...options,
      headers,
    });
  };

  try {
    return await send(accessToken);
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 401) throw error;
    const refreshed = await refreshAuthCookies(event).catch(() => null);
    if (!refreshed) {
      clearAuthCookies(event);
      throw createError({ statusCode: 401, statusMessage: "Authentication required" });
    }
    return await send(refreshed.accessToken);
  }
}
