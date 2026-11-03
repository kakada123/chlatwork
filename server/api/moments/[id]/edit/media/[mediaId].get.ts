import { createError, getRouterParam, proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  const id = getRouterParam(event, "id") ?? "";
  const mediaId = getRouterParam(event, "mediaId") ?? "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(id) || !uuid.test(mediaId)) throw createError({ statusCode: 404 });
  const token = await getFreshAccessToken(event);
  return proxyRequest(event, `${apiBaseUrl(event)}/moments/${id}/edit/media/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}`, Cookie: "" },
  });
});
