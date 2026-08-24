import { readAuthBody, requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const body = await readAuthBody(event);
  return await requestAuthenticatedApi(event, "/payback/state", { method: "PUT", body });
});
