import { readAuthBody, requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return await requestAuthenticatedApi(event, "/expenses/entries", {
    method: "PATCH",
    body: await readAuthBody(event),
  });
});
