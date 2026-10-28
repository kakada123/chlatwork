import { getQuery, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const query = getQuery(event);
  // Do not repeat a paid provider search after an upstream failure.
  return await requestAuthApi(event, "/food/search", { query, retry: 0 });
});
