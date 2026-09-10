import { createError, getQuery, setResponseHeader } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const chatId = getQuery(event).chatId;
  if (typeof chatId !== "string" || !/^-[1-9][0-9]{0,15}$/.test(chatId) || !Number.isSafeInteger(Number(chatId))) {
    throw createError({ statusCode: 400, statusMessage: "Select a valid Telegram group" });
  }
  setResponseHeader(event, "Cache-Control", "no-store");
  return requestAuthenticatedApi(event, `/admin/member-khqr?chatId=${chatId}`);
});
