import { proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const accessToken = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(
    event,
    `${apiBaseUrl(event)}/feature-availability/admin`,
    {
      headers: { Authorization: `Bearer ${accessToken}`, Cookie: "" },
    },
  );
});
