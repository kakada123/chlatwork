import {
  createError,
  getMethod,
  getRequestURL,
  getRouterParam,
  proxyRequest,
  setResponseHeader,
} from "h3";
import {
  apiBaseUrl,
  getFreshAccessToken,
} from "../../utils/auth";

const POST_PATHS = new Set([
  "posts/generate",
  "scripts/generate",
  "hooks/generate",
  "content-ideas/generate",
  "khmer/grammar",
  "khmer/rewrite",
  "khmer/latin-to-khmer",
  "khmer/humanize",
  "repurpose/facebook-to-tiktok",
  "repurpose/long-to-short",
  "repurpose/video-to-social",
  "video/subtitle",
  "video/caption",
  "video/summary",
  "video/content-pack",
  "video/upload-ticket",
]);

const isAllowedGet = (path: string) =>
  path === "credits" ||
  path === "credits/transactions" ||
  path === "history" ||
  /^video\/jobs\/[0-9a-f-]{36}(?:\/subtitles)?$/i.test(path);

export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const path = (getRouterParam(event, "path") ?? "").replace(/^\/+|\/+$/g, "");
  if (
    !path ||
    (method === "POST" ? !POST_PATHS.has(path) : method !== "GET" || !isAllowedGet(path))
  ) {
    throw createError({ statusCode: 404, statusMessage: "Creator API route not found" });
  }

  const accessToken = await getFreshAccessToken(event);
  const query = getRequestURL(event).search;
  setResponseHeader(event, "Cache-Control", "no-store");
  // Streaming preserves large video uploads without buffering them inside Nuxt.
  return proxyRequest(event, `${apiBaseUrl(event)}/creator-ai/${path}${query}`, {
    streamRequest: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Cookie: "",
    },
  });
});
