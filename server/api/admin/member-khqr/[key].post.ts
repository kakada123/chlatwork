import { createError, getHeader, getQuery, getRouterParam, proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const key = getRouterParam(event, "key") ?? "";
  const chatId = getQuery(event).chatId;
  if (typeof chatId !== "string" || !/^-[1-9][0-9]{0,15}$/.test(chatId) || !Number.isSafeInteger(Number(chatId))) {
    throw createError({ statusCode: 400, statusMessage: "Select a valid Telegram group" });
  }
  if (!/^[a-z0-9_]{1,32}$/.test(key)) throw createError({ statusCode: 404 });
  // A custom header prevents cross-origin HTML forms from submitting with cookies.
  if (getHeader(event, "x-khqr-upload") !== "1") throw createError({ statusCode: 403 });
  const token = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(event, `${apiBaseUrl(event)}/admin/member-khqr/${key}?chatId=${chatId}`, {
    streamRequest: true,
    headers: { Authorization: `Bearer ${token}`, Cookie: "" },
  });
});
