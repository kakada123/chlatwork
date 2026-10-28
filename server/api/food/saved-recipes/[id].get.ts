import { getRouterParam, setHeader } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  return requestAuthenticatedApi(
    event,
    `/food/saved-recipes/${encodeURIComponent(getRouterParam(event, "id") || "")}`,
    { retry: 0 },
  );
});
