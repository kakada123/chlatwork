import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  return await requestAuthApi(
    event,
    `/moments/${getRouterParam(event, "slug")}`,
  );
});
