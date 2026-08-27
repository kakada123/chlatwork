import { getQuery } from "h3";
import { requestAuthenticatedApi } from "../../utils/auth";

const ALLOWED_RANGES = new Set(["7d", "30d", "90d"]);

export default defineEventHandler(async (event) => {
  const requestedRange = getQuery(event).range;
  const range = typeof requestedRange === "string" && ALLOWED_RANGES.has(requestedRange)
    ? requestedRange
    : "30d";

  return await requestAuthenticatedApi(event, `/admin/analytics?range=${range}`);
});
