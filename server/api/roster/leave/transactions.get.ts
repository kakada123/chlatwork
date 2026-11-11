import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return await requestAuthenticatedApi(event, "/roster/leave/transactions", {
    query: getQuery(event),
  });
});
