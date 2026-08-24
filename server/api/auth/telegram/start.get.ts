import { createHash, randomBytes } from "node:crypto";
import { createError, getHeader, sendRedirect, setCookie, type H3Event } from "h3";

const STATE_COOKIE = "chlatwork_telegram_oidc_state";
const VERIFIER_COOKIE = "chlatwork_telegram_oidc_verifier";

function base64Url(value: Buffer) {
  return value.toString("base64url");
}

function requestOrigin(event: H3Event) {
  const host = (getHeader(event, "x-forwarded-host") ?? getHeader(event, "host"))?.split(",")[0]?.trim();
  if (!host) throw createError({ statusCode: 400, statusMessage: "Missing host header" });
  const proto = getHeader(event, "x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return `${proto}://${host}`;
}

export default defineEventHandler(async (event) => {
  const clientId = useRuntimeConfig(event).public.telegramClientId;
  if (!clientId) throw createError({ statusCode: 503, statusMessage: "Telegram login is not configured" });

  const origin = requestOrigin(event);
  const state = base64Url(randomBytes(24));
  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash("sha256").update(verifier).digest());
  const options = { httpOnly: true, sameSite: "lax" as const, secure: origin.startsWith("https://"), path: "/", maxAge: 600 };
  setCookie(event, STATE_COOKIE, state, options);
  setCookie(event, VERIFIER_COOKIE, verifier, options);

  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${origin}/api/auth/telegram/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return await sendRedirect(event, url.toString(), 302);
});
