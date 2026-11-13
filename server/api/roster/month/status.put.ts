import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return await requestAuthenticatedApi(event, "/roster/month/status", {
    method: "PUT",
    body: await readBody(event),
  });
});
