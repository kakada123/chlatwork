import { readBody } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return await requestAuthApi(event, "/food/recommend", {
    method: "POST",
    body,
  });
});
