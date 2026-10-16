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
  const id =
    "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const allowed =
    method === "GET"
      ? path === "" ||
        path === "session" ||
        new RegExp(`^${id}(?:/(?:activity|khqr|vote/history))?$`, "i").test(
          path,
        )
      : method === "POST"
        ? ["manager-request", "connections"].includes(path) ||
          new RegExp(`^${id}/vote/reset$`, "i").test(path)
        : method === "PATCH"
          ? new RegExp(`^${id}/features$`, "i").test(path)
          : method === "PUT" &&
            new RegExp(
              `^${id}/vote(?:/options/option-[1-9][0-9]{0,8}/image)?$`,
              "i",
            ).test(path);
  if (!allowed) throw createError({ statusCode: 404 });
  if (method !== "GET" && getHeader(event, "x-group-workspace") !== "1")
    throw createError({ statusCode: 403 });
  const length = Number(getHeader(event, "content-length"));
  if (Number.isFinite(length) && length > 10 * 1024 * 1024 + 65536)
    throw createError({ statusCode: 413 });
  const token = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(
    event,
    `${apiBaseUrl(event)}/bot/groups${path ? `/${path}` : ""}${getRequestURL(event).search}`,
    {
      streamRequest: true,
      headers: { Authorization: `Bearer ${token}`, Cookie: "" },
    },
  );
});
