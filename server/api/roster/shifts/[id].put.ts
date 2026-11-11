import { requestAuthenticatedApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const id = getRouterParam(event, "id");
  const body = await readBody(event);
  return await requestAuthenticatedApi(event, `/roster/shifts/${id}`, {
    method: "PUT",
    body,
  });
});
