import { readBody, setHeader } from "h3";
import { requestAuthApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  setHeader(event, "Cache-Control", "no-store");
  return await requestAuthApi(event, "/food/pick", {
    method: "POST",
    retry: 0,
    body: await readBody(event),
  });
});
