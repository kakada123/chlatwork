import { requestAuthenticatedApi } from "../../../../utils/auth";
import { appOrigin } from "../../../../utils/google-link";

export default defineEventHandler(async (event) => {
  const { ticket } = await requestAuthenticatedApi<{ ticket: string }>(event, "/auth/google/link-ticket", {
    method: "POST",
  });
  const url = new URL("/api/auth/google/link/authorize", appOrigin(event));
  url.searchParams.set("ticket", ticket);
  return { url: url.toString() };
});
