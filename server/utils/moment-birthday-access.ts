import { createHash } from "node:crypto";
import { getCookie, getHeader, getRequestURL, setCookie, type H3Event } from "h3";

export function momentBirthdayCookieName(slug: string): string {
  return `chlatwork_birthday_${createHash("sha256").update(slug).digest("hex").slice(0, 24)}`;
}

export function momentBirthdayAccessHeaders(event: H3Event, slug: string): Record<string, string> {
  const token = getCookie(event, momentBirthdayCookieName(slug));
  return token && token.length <= 256 ? { "x-moment-birthday-access": token } : {};
}

export function setMomentBirthdayAccess(event: H3Event, slug: string, token: string, maxAge: number) {
  const forwarded = getHeader(event, "x-forwarded-proto")?.split(",")[0]?.trim();
  // Root path also includes SSR page requests; the capability stays inaccessible to browser JavaScript.
  setCookie(event, momentBirthdayCookieName(slug), token, {
    httpOnly: true, sameSite: "lax", secure: forwarded === "https" || getRequestURL(event).protocol === "https:",
    path: "/", maxAge: Math.min(3600, maxAge),
  });
}
