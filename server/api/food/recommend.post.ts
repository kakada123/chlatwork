import { readBody, setHeader } from "h3";
import { requestFoodApi } from "../../utils/food";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const body = await readBody(event);
  return await requestFoodApi(event, "/food/recommend", {
    method: "POST",
    retry: 0,
    body,
  });
});
