import {
  createError,
  getMethod,
  getRouterParam,
  readBody,
  readMultipartFormData,
  setResponseHeader,
} from "h3";
import {
  apiBaseUrl,
  getFreshAccessToken,
  requestAuthenticatedApi,
} from "../../utils/auth";
import { assertProfileRequestOrigin } from "../../utils/profile-proxy";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path") ?? "";
  const method = getMethod(event);
  const uuid = "[0-9a-fA-F-]{36}";
  const image = /^me\/media\/(avatar|background)$/.test(path);
  const allowed =
    (path === "me" && ["GET", "PATCH"].includes(method)) ||
    (path === "me/links" && method === "POST") ||
    (path === "me/links/reorder" && method === "PUT") ||
    (new RegExp(`^me/links/${uuid}$`).test(path) &&
      ["PATCH", "DELETE"].includes(method)) ||
    (image && ["GET", "POST"].includes(method));
  if (!allowed)
    throw createError({
      statusCode: 404,
      statusMessage: "Profile route not found.",
    });
  assertProfileRequestOrigin(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  if (image && method === "GET") {
    const token = await getFreshAccessToken(event);
    const response = await $fetch<ArrayBuffer>(
      `${apiBaseUrl(event)}/profiles/${path}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arrayBuffer",
      },
    );
    setResponseHeader(event, "Content-Type", "image/webp");
    setResponseHeader(event, "X-Content-Type-Options", "nosniff");
    return new Uint8Array(response);
  }
  if (image) {
    // Authenticate before accepting or buffering a personal-photo upload.
    await getFreshAccessToken(event);
    const parts = await readMultipartFormData(event);
    const file = parts?.find((part) => part.name === "file" && part.filename);
    if (!file?.data || !file.type || file.data.length > 5 * 1024 * 1024)
      throw createError({
        statusCode: 400,
        statusMessage: "Choose an image of 5MB or smaller.",
      });
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(file.data)], { type: file.type }),
      "profile-photo",
    );
    return requestAuthenticatedApi(event, `/profiles/${path}`, {
      method: "POST",
      body: form,
    });
  }
  return requestAuthenticatedApi(event, `/profiles/${path}`, {
    method: method as "GET" | "PATCH" | "POST" | "PUT" | "DELETE",
    ...(method === "GET" || method === "DELETE"
      ? {}
      : { body: await readBody(event) }),
  });
});
