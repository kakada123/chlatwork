import { getQuery, setHeader } from "h3";
import { requestAuthenticatedApi } from "../../utils/auth";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  return requestAuthenticatedApi(event, "/food/saved-recipes", {
    query: getQuery(event),
    retry: 0,
  });
});
