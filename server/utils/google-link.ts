import { createError, setCookie, type H3Event } from "h3";
import { trustedRequestOrigin } from "./product-domain";

export const GOOGLE_LINK_STATE_COOKIE = "chlatwork_google_link_state";
export const GOOGLE_LINK_VERIFIER_COOKIE = "chlatwork_google_link_verifier";
export const GOOGLE_LINK_TICKET_COOKIE = "chlatwork_google_link_ticket";

export function appOrigin(event: H3Event) {
  // Keep PKCE/state cookies and the callback on the same explicitly configured host.
  return trustedRequestOrigin(event);
}

export function setGoogleLinkCookie(event: H3Event, name: string, value: string) {
  const origin = appOrigin(event);
  setCookie(event, name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/api/auth/google",
    maxAge: 5 * 60,
  });
}

export function telegramMiniAppDeepLink(event: H3Event, result: "google_linked" | "google_failed") {
  const config = useRuntimeConfig(event);
  const botUsername = String(config.telegramBotUsername || "").replace(/^@/, "");
  const shortName = String(config.telegramMiniAppShortName || "");
  if (!/^[A-Za-z0-9_]{5,32}$/.test(botUsername)) {
    throw createError({ statusCode: 503, statusMessage: "Telegram Mini App return link is not configured" });
  }
  if (shortName && !/^[A-Za-z0-9_]{3,64}$/.test(shortName)) {
    throw createError({ statusCode: 503, statusMessage: "Telegram Mini App short name is invalid" });
  }
  const path = shortName ? `${botUsername}/${shortName}` : botUsername;
  return `https://t.me/${path}?startapp=${result}`;
}
