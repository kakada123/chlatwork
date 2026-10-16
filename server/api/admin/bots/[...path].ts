import {
  createError,
  getHeader,
  getMethod,
  getRequestURL,
  getRouterParam,
  proxyRequest,
  setResponseHeader,
} from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../utils/auth";
export default defineEventHandler(async (event) => {
  const method = getMethod(event);
  const path = getRouterParam(event, "path") ?? "";
  const userPath = "users/[0-9a-f-]{36}";
  const allowed =
    method === "GET"
      ? ["overview", "users", "groups"].includes(path) ||
        new RegExp(`^(?:${userPath}|groups/[0-9a-f-]{36})$`, "i").test(path)
      : method === "POST"
        ? new RegExp(
            `^(?:${userPath}/(?:review|khqr)|groups/[0-9a-f-]{36}/status)$`,
            "i",
          ).test(path)
        : method === "DELETE" &&
          new RegExp(`^${userPath}/khqr$`, "i").test(path);
  if (!allowed) throw createError({ statusCode: 404 });
  if (method !== "GET" && getHeader(event, "x-bot-admin") !== "1")
    throw createError({ statusCode: 403 });
  const token = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(
    event,
    `${apiBaseUrl(event)}/admin/bots/${path}${getRequestURL(event).search}`,
    {
      streamRequest: true,
      headers: { Authorization: `Bearer ${token}`, Cookie: "" },
    },
  );
});
