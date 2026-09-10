import { createError, getHeader, getRouterParam, proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, "key") ?? "";
  if (!/^[a-z0-9_]{1,32}$/.test(key)) throw createError({ statusCode: 404 });
  // A custom header prevents cross-origin HTML forms from submitting with cookies.
  if (getHeader(event, "x-khqr-upload") !== "1") throw createError({ statusCode: 403 });
  const token = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(event, `${apiBaseUrl(event)}/admin/member-khqr/${key}`, {
    streamRequest: true,
    headers: { Authorization: `Bearer ${token}`, Cookie: "" },
  });
});
