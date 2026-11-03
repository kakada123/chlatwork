import { createError, getRouterParam, setResponseHeader } from "h3";
import { readAuthBody, requestAuthApi } from "../../../utils/auth";
import { setMomentBirthdayAccess } from "../../../utils/moment-birthday-access";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  const slug = getRouterParam(event, "id") ?? "";
  if (!/^[a-z0-9][a-z0-9_-]{0,199}$/i.test(slug)) throw createError({ statusCode: 404 });
  const result = await requestAuthApi<{ token: string; maxAge: number }>(event, `/moments/${slug}/unlock`, { method: "POST", body: await readAuthBody(event) });
  if (!result || typeof result.token !== "string" || !result.token || result.token.length > 256 || !Number.isInteger(result.maxAge) || result.maxAge <= 0) {
    throw createError({ statusCode: 502, statusMessage: "Could not open this birthday." });
  }
  setMomentBirthdayAccess(event, slug, result.token, result.maxAge);
  return { unlocked: true };
});
