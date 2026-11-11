import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const date = getRouterParam(event, "date");
  const body = await readBody(event);
  return await requestAuthenticatedApi(event, `/roster/days/${date}`, {
    method: "PUT",
    body,
  });
});
