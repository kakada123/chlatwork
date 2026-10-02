import { createError, getMethod, getRouterParam, setResponseHeader } from "h3";
import { apiBaseUrl, requestAuthApi } from "../../../utils/auth";
import { assertProfileRequestOrigin } from "../../../utils/profile-proxy";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path") ?? "";
  const method = getMethod(event);
  const slug = "[a-zA-Z0-9_-]{3,40}";
  const image = new RegExp(
    `^${slug}/(?:media/(?:avatar|background)|og-image)$`,
  ).test(path);
  if (!(
    (method === "GET" && (new RegExp(`^${slug}$`).test(path) || image)) ||
    (method === "POST" &&
      new RegExp(`^${slug}/(?:view|links/[0-9a-fA-F-]{36}/click)$`).test(path))
  )) {
    throw createError({
      statusCode: 404,
      statusMessage: "Profile route not found.",
    });
  }
  assertProfileRequestOrigin(event);
  // Publication and enabled-link changes must be visible immediately, including after unpublishing.
  setResponseHeader(event, "Cache-Control", "no-store");
  if (image) {
    try {
      const response = await $fetch<ArrayBuffer>(
        `${apiBaseUrl(event)}/public/profiles/${path}`,
        { responseType: "arrayBuffer" },
      );
      setResponseHeader(
        event,
        "Content-Type",
        path.endsWith("og-image") ? "image/jpeg" : "image/webp",
      );
      setResponseHeader(event, "X-Content-Type-Options", "nosniff");
      return new Uint8Array(response);
    } catch (error) {
      const status =
        (error as { response?: { status?: number } }).response?.status ?? 502;
      throw createError({
        statusCode: status,
        statusMessage:
          status === 404 ? "Image not found." : "Could not load image.",
      });
    }
  }
  return requestAuthApi(event, `/public/profiles/${path}`, {
    method: method as "GET" | "POST",
  });
});
