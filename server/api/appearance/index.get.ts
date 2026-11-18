import { setResponseHeader } from "h3";
import { apiBaseUrl } from "../../utils/auth";

export default defineEventHandler((event) => {
  setResponseHeader(event, "Cache-Control", "no-store");
  // A site-wide read does not require the visitor's cookies or authorization.
  return $fetch<{ khmerFont: "google-sans" | "hanuman" }>(`${apiBaseUrl(event)}/appearance`, {
    retry: 0,
    timeout: 1500,
  });
});
