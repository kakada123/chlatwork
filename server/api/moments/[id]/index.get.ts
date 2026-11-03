import { requestAuthApi } from "../../../utils/auth";
import { momentBirthdayAccessHeaders } from "../../../utils/moment-birthday-access";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  // Nitro requires one parameter name here; public GETs interpret the shared key as a slug.
  const slug = getRouterParam(event, "id") ?? "";
  return await requestAuthApi(
    event,
    `/moments/${encodeURIComponent(slug)}`,
    { headers: momentBirthdayAccessHeaders(event, slug) },
  );
});
