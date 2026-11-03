import { createError, getRouterParam, setResponseHeader } from "h3";
import { requestAuthenticatedApi } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  const id = getRouterParam(event, "id") ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw createError({ statusCode: 404 });
  return requestAuthenticatedApi(event, `/moments/${id}/edit`);
});
