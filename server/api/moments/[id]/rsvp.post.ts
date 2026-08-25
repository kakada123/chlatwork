import { readAuthBody, requestAuthApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const slug = getRouterParam(event, "id");
  const body = await readAuthBody(event);
  return await requestAuthApi(event, `/moments/${slug}/rsvp`, {
    method: "POST",
    body,
  });
});
