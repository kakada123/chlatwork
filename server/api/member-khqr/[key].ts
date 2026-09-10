import { createError, getMethod, getRouterParam, proxyRequest } from "h3";
import { apiBaseUrl } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, "key") ?? "";
  if (!/^[a-z0-9_]{1,32}$/.test(key) || !["GET", "HEAD"].includes(getMethod(event))) {
    throw createError({ statusCode: 404 });
  }
  return proxyRequest(event, `${apiBaseUrl(event)}/member-khqr/${key}`, {
    headers: { Cookie: "", Authorization: "" },
  });
});
