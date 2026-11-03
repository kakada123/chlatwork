import { createError, getHeader, getRouterParam, proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  const id = getRouterParam(event, "id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw createError({ statusCode: 404 });
  if (!getHeader(event, "content-type")?.toLowerCase().startsWith("multipart/form-data;")) throw createError({ statusCode: 415, statusMessage: "Send the birthday changes as multipart form data." });
  const length = getHeader(event, "content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > 4_000_000)) throw createError({ statusCode: 413, statusMessage: "New photos are too large to save together. Try fewer or smaller photos." });
  // Refresh authentication before consuming the body: streamed multipart uploads cannot be retried safely.
  const token = await getFreshAccessToken(event);
  return proxyRequest(event, `${apiBaseUrl(event)}/moments/${id}/edit`, {
    streamRequest: true,
    headers: { Authorization: `Bearer ${token}`, Cookie: "" },
  });
});
