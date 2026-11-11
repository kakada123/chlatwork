import { readBody } from "h3";
import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return await requestAuthenticatedApi(event, "/roster/month/reset", {
    method: "POST",
    body,
  });
});
