import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  return await requestAuthenticatedApi(event, "/tool-usage", { method: "DELETE" });
});
