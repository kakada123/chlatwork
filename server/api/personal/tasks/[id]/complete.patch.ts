import { requestAuthenticatedApi } from "../../../../utils/auth";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  return await requestAuthenticatedApi(
    event,
    `/personal/tasks/${encodeURIComponent(id ?? "")}/complete`,
    { method: "PATCH" },
  );
});
