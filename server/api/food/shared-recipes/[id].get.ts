import { getRouterParam, setHeader } from "h3";
import { requestAuthApi } from "../../../utils/auth";

export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return requestAuthApi(
    event,
    `/food/shared-recipes/${encodeURIComponent(getRouterParam(event, "id") || "")}`,
    {
      retry: 0,
    },
  );
});
