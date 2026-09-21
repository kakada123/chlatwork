import { proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl } from "../../utils/auth";

export default defineEventHandler((event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  return proxyRequest(event, `${apiBaseUrl(event)}/feature-availability`, {
    // Public status never needs browser session cookies or bearer tokens.
    headers: { Cookie: "", Authorization: "" },
  });
});
