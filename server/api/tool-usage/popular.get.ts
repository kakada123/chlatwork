import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  return await requestAuthApi(event, "/tool-usage/popular");
});
