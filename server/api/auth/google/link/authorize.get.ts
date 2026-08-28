import { createHash, randomBytes } from "node:crypto";
import { createError, getQuery, sendRedirect, setHeader } from "h3";
import {
  GOOGLE_LINK_STATE_COOKIE,
  GOOGLE_LINK_TICKET_COOKIE,
  GOOGLE_LINK_VERIFIER_COOKIE,
  appOrigin,
  setGoogleLinkCookie,
} from "../../../../utils/google-link";

export default defineEventHandler(async (event) => {
  const ticket = getQuery(event).ticket;
  const clientId = useRuntimeConfig(event).public.googleClientId;
  if (typeof ticket !== "string" || !ticket || ticket.length > 4096 || !clientId) {
    throw createError({ statusCode: 400, statusMessage: "Invalid Google link request" });
  }

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  setGoogleLinkCookie(event, GOOGLE_LINK_STATE_COOKIE, state);
  setGoogleLinkCookie(event, GOOGLE_LINK_VERIFIER_COOKIE, verifier);
  setGoogleLinkCookie(event, GOOGLE_LINK_TICKET_COOKIE, ticket);
  // The short-lived link ticket must not be forwarded in the Referer header.
  setHeader(event, "Referrer-Policy", "no-referrer");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appOrigin(event)}/api/auth/google/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return await sendRedirect(event, url.toString(), 302);
});
