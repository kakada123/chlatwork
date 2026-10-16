import {
  createError,
  getRouterParam,
  getQuery,
  proxyRequest,
  setResponseHeader,
} from "h3";
import { apiBaseUrl } from "../../../utils/auth";
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const token = getQuery(event).token;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    ) ||
    typeof token !== "string" ||
    token.length > 4096
  )
    throw createError({ statusCode: 404 });
  setResponseHeader(event, "Cache-Control", "no-store");
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");
  // The short-lived media capability is the only authority forwarded here.
  return proxyRequest(
    event,
    `${apiBaseUrl(event)}/bot/group-media/${id}?token=${encodeURIComponent(token)}`,
    { headers: { Authorization: "", Cookie: "" } },
  );
});
