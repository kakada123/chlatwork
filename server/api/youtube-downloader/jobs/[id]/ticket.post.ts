import { getRouterParam, createError, setResponseHeader } from "h3";
import { requestAuthenticatedApi } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw createError({ statusCode: 400, statusMessage: "Invalid download ID" });
  setResponseHeader(event, "Cache-Control", "no-store");
  setResponseHeader(event, "Referrer-Policy", "no-referrer");
  return requestAuthenticatedApi(event, `/youtube-downloader/jobs/${id}/ticket`, {
    method: "POST",
  });
});
