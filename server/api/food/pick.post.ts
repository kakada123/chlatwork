import { readBody, setHeader } from "h3";
import { requestFoodApi } from "../../utils/food";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  return await requestFoodApi(event, "/food/pick", {
    method: "POST",
    retry: 0,
    body: await readBody(event),
  });
});
