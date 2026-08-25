import { requestAuthenticatedApi } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  return await requestAuthenticatedApi(event, `/moments/${getRouterParam(event, "id")}/guests`);
});
