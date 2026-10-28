import { readBody, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  const body = await readBody(event);
  return await requestAuthApi(event, "/food/recommend", {
    method: "POST",
    retry: 0,
    body,
  });
});
