import { getQuery, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const query = getQuery(event);
  // Legacy GET is now billable; ofetch's default GET retry would run the picker twice on a 503.
  return await requestAuthApi(event, "/food/random", { query, retry: 0 });
});
