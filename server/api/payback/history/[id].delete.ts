import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const id = getRouterParam(event, "id");
  return await requestAuthenticatedApi(event, `/payback/history/${encodeURIComponent(id ?? "")}`, {
    method: "DELETE",
  });
});
