import { deleteCookie, getCookie, getQuery, sendRedirect, type H3Event } from "h3";
import { requestAuthApi } from "../../../utils/auth";
import {
  GOOGLE_LINK_STATE_COOKIE,
  GOOGLE_LINK_TICKET_COOKIE,
  GOOGLE_LINK_VERIFIER_COOKIE,
  appOrigin,
  telegramMiniAppDeepLink,
} from "../../../utils/google-link";

function clearFlow(event: H3Event) {
  for (const name of [GOOGLE_LINK_STATE_COOKIE, GOOGLE_LINK_VERIFIER_COOKIE, GOOGLE_LINK_TICKET_COOKIE]) {
    deleteCookie(event, name, { path: "/api/auth/google" });
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const code = typeof query.code === "string" ? query.code : "";
  const state = typeof query.state === "string" ? query.state : "";
  const expectedState = getCookie(event, GOOGLE_LINK_STATE_COOKIE);
  const codeVerifier = getCookie(event, GOOGLE_LINK_VERIFIER_COOKIE);
  const ticket = getCookie(event, GOOGLE_LINK_TICKET_COOKIE);
  let result: "google_linked" | "google_failed" = "google_failed";

  if (code && state && state === expectedState && codeVerifier && ticket) {
    try {
      await requestAuthApi(event, "/auth/google/link-code", {
        method: "POST",
        body: {
          code,
          codeVerifier,
          ticket,
          redirectUri: `${appOrigin(event)}/api/auth/google/callback`,
        },
      });
      result = "google_linked";
    } catch {
      result = "google_failed";
    }
  }

  clearFlow(event);
  return await sendRedirect(event, telegramMiniAppDeepLink(event, result), 302);
});
