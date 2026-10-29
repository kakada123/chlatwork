import { getQuery, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";
export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  return requestAuthApi(event, "/food/menu-catalog", {
    query: getQuery(event),
    retry: 0,
  });
});
