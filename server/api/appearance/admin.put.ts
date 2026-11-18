import { proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl, getFreshAccessToken } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const token = await getFreshAccessToken(event);
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(event, `${apiBaseUrl(event)}/appearance/admin`, {
    headers: { Authorization: `Bearer ${token}`, Cookie: "" },
  });
});
