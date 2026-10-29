import { getQuery, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler((event) => {
  setHeader(event, "Cache-Control", "no-store");
  return requestAuthApi(event, "/food/shared-recipes", {
    query: getQuery(event),
    retry: 0,
  });
});
