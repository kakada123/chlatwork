import {
  createError,
  getHeader,
  getMethod,
  getQuery,
  getRequestWebStream,
  getRouterParam,
  setResponseHeader,
} from "h3";
import { getFreshAccessToken, requestAuthenticatedApi } from "../../utils/auth";
import { assertProfileRequestOrigin } from "../../utils/profile-proxy";
import { allowedTasksRoute } from "../../utils/tasks-routes";

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, "path") ?? "";
  const method = getMethod(event);
  if (!allowedTasksRoute(path, method))
    throw createError({
      statusCode: 404,
      statusMessage: "Tasks route not found.",
    });
  assertProfileRequestOrigin(event);
  setResponseHeader(event, "Cache-Control", "private, no-store");
  const upload = method === "POST" && path.endsWith("/attachments");
  const binary = method === "GET" && /\/attachments\/[^/]+$/.test(path);
  // Authenticate before buffering bodies; enforce limits even for chunked requests without Content-Length.
  await getFreshAccessToken(event);
  let body: unknown;
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    !path.endsWith("/restore") &&
    !path.endsWith("/duplicate")
  ) {
    const limit = upload ? 5 * 1024 * 1024 + 65536 : 128 * 1024;
    if (Number(getHeader(event, "content-length")) > limit)
      throw createError({
        statusCode: 413,
        statusMessage: "Request is too large.",
      });
    const reader = getRequestWebStream(event)?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > limit) {
            await reader.cancel();
            throw createError({
              statusCode: 413,
              statusMessage: "Request is too large.",
            });
          }
          chunks.push(part.value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    if (upload) {
      let form: FormData;
      try {
        form = await new Response(bytes, {
          headers: { "Content-Type": getHeader(event, "content-type") || "" },
        }).formData();
      } catch {
        throw createError({
          statusCode: 400,
          statusMessage: "Choose a file to upload.",
        });
      }
      const entries = [...form.entries()];
      const file = form.get("file");
      if (
        entries.length !== 1 ||
        !file ||
        typeof file === "string" ||
        file.size > 5 * 1024 * 1024 ||
        !file.size
      )
        throw createError({
          statusCode: 400,
          statusMessage: "Choose one file of 5 MiB or smaller.",
        });
      body = form;
    } else {
      try {
        body = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw createError({
          statusCode: 400,
          statusMessage: "Invalid JSON request.",
        });
      }
    }
  }
  if (binary) {
    const data = await requestAuthenticatedApi<ArrayBuffer>(
      event,
      `/tasks/${path}`,
      {
        query: { preview: getQuery(event).preview === "1" ? "1" : "0" },
        responseType: "arrayBuffer",
        onResponse({ response }) {
          if (response.ok)
            for (const name of [
              "Content-Type",
              "Content-Disposition",

              "X-Content-Type-Options",
              "Content-Security-Policy",
            ]) {
              const value = response.headers.get(name);
              if (value) setResponseHeader(event, name, value);
            }
        },
      },
    );
    setResponseHeader(event, "Content-Length", data.byteLength);
    return new Uint8Array(data);
  }
  return requestAuthenticatedApi(event, `/tasks/${path}`, {
    method: method as "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    ...(method === "GET"
      ? { query: getQuery(event) }
      : body === undefined
        ? {}
        : { body: body as Record<string, unknown> | FormData }),
  });
});
