import { requestAuthApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  // Nitro requires one parameter name here; public GETs interpret the shared key as a slug.
  return await requestAuthApi(
    event,
    `/moments/${getRouterParam(event, "id")}`,
  );
});
