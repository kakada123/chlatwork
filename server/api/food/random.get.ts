import { getQuery } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  return await requestAuthApi(event, "/food/random", { query });
});
