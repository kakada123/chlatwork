import { requestAuthenticatedApi } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{ toolKey: string; event: "OPEN" }>(event);
  return await requestAuthenticatedApi(event, "/tool-usage", {
    method: "POST",
    body,
  });
});
