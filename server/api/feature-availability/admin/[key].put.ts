import {
  createError,
  getRouterParam,
  proxyRequest,
  setResponseHeader,
} from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, "key", { decode: true });
  if (!key || !/^(website|creator|telegram):[a-z0-9_-]+$/i.test(key)) {
    throw createError({ statusCode: 404, statusMessage: "Feature not found" });
  }
  const accessToken = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(
    event,
    `${apiBaseUrl(event)}/feature-availability/admin/${encodeURIComponent(key)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Cookie: "" },
    },
  );
});
