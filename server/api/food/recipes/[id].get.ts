import { getRouterParam } from "h3";
import { requestAuthApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  return await requestAuthApi(event, `/food/recipes/${encodeURIComponent(id || "")}`);
});
