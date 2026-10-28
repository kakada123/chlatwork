import { setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "public, max-age=3600");
  return await requestAuthApi(event, "/food/filters", { retry: 0 });
});
