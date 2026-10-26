import { deleteCookie, getCookie, getQuery, sendRedirect, type H3Event } from "h3";
import { trustedRequestOrigin } from "../../../utils/product-domain";
import { safeReturnPath } from "../../../../app/lib/product-domains";
import { clearAuthCookies, requestAuthApi, setAuthCookies, type AuthTokenResponse } from "../../../utils/auth";

const STATE_COOKIE = "chlatwork_telegram_oidc_state";
const VERIFIER_COOKIE = "chlatwork_telegram_oidc_verifier";

function clearFlow(event: H3Event) {
  deleteCookie(event, STATE_COOKIE, { path: "/" });
  deleteCookie(event, VERIFIER_COOKIE, { path: "/" });
  deleteCookie(event, "chlatwork_telegram_return", { path: "/" });
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = typeof query.code === "string" ? query.code : "";
  const state = typeof query.state === "string" ? query.state : "";
  const expectedState = getCookie(event, STATE_COOKIE);
  const codeVerifier = getCookie(event, VERIFIER_COOKIE);
  const returnPath = safeReturnPath(getCookie(event, "chlatwork_telegram_return"));

  if (!code || !state || state !== expectedState || !codeVerifier) {
    clearFlow(event);
    clearAuthCookies(event);
    return await sendRedirect(event, "/login?telegram=failed", 302);
  }

  try {
    const auth = await requestAuthApi<AuthTokenResponse>(event, "/auth/telegram/code", {
      method: "POST",
      body: { code, codeVerifier, redirectUri: `${trustedRequestOrigin(event)}/api/auth/telegram/callback` },
    });
    setAuthCookies(event, auth);
    clearFlow(event);
    return await sendRedirect(event, returnPath, 302);
  } catch {
    clearFlow(event);
    clearAuthCookies(event);
    return await sendRedirect(event, "/login?telegram=failed", 302);
  }
});
