import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const body = await readBody(event);
  return await requestAuthenticatedApi(event, "/roster/shifts", {
    method: "POST",
    body,
  });
});
