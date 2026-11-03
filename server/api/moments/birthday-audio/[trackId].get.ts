import { createError, getRouterParam, proxyRequest, setResponseHeader } from "h3";
import { apiBaseUrl } from "../../../utils/auth";

export default defineEventHandler(async (event) => {
  const trackId = getRouterParam(event, "trackId") ?? "";
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(trackId)) throw createError({ statusCode: 404 });
  // Stream Range requests unchanged so seeking never buffers an entire Railway audio file in Nuxt.
  return proxyRequest(event, `${apiBaseUrl(event)}/moments/birthday-audio/${trackId}`, {
    headers: { Authorization: "", Cookie: "", "Accept-Encoding": "identity" },
    onResponse(event, response) {
      // H3 drops upstream lengths for decompressed responses; this unmodified audio stream retains its byte length.
      const length = response.headers.get("content-length");
      if (!response.headers.has("content-encoding") && length && /^\d+$/.test(length)) {
        setResponseHeader(event, "Content-Length", length);
      }
    },
  });
});
