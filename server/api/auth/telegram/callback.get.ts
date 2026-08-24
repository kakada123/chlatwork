import { deleteCookie, getCookie, getHeader, getQuery, sendRedirect, type H3Event } from "h3";
import { clearAuthCookies, requestAuthApi, setAuthCookies, type AuthTokenResponse } from "../../../utils/auth";

const STATE_COOKIE = "chlatwork_telegram_oidc_state";
const VERIFIER_COOKIE = "chlatwork_telegram_oidc_verifier";

function origin(event: H3Event) {
  const host = (getHeader(event, "x-forwarded-host") ?? getHeader(event, "host"))?.split(",")[0]?.trim();
  const proto = getHeader(event, "x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return host ? `${proto}://${host}` : "";
}

function clearFlow(event: H3Event) {
  deleteCookie(event, STATE_COOKIE, { path: "/" });
  deleteCookie(event, VERIFIER_COOKIE, { path: "/" });
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = typeof query.code === "string" ? query.code : "";
  const state = typeof query.state === "string" ? query.state : "";
  const expectedState = getCookie(event, STATE_COOKIE);
  const codeVerifier = getCookie(event, VERIFIER_COOKIE);

  if (!code || !state || state !== expectedState || !codeVerifier) {
    clearFlow(event);
    clearAuthCookies(event);
    return await sendRedirect(event, "/login?telegram=failed", 302);
  }

  try {
    const auth = await requestAuthApi<AuthTokenResponse>(event, "/auth/telegram/code", {
      method: "POST",
      body: { code, codeVerifier, redirectUri: `${origin(event)}/api/auth/telegram/callback` },
    });
    setAuthCookies(event, auth);
    clearFlow(event);
    return await sendRedirect(event, "/account", 302);
  } catch {
    clearFlow(event);
    clearAuthCookies(event);
    return await sendRedirect(event, "/login?telegram=failed", 302);
  }
});
