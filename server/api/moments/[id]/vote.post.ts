import { readAuthBody, requestAuthApi } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  const id = getRouterParam(event, "id");
  const body = await readAuthBody(event);
  return requestAuthApi(event, `/moments/${encodeURIComponent(id ?? "")}/vote`, {
    method: "POST",
    body,
  });
});
