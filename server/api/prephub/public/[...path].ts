import {
  createError,
  getMethod,
  getQuery,
  getRouterParam,
  setResponseHeader,
} from "h3";
import { requestAuthApi } from "../../../utils/auth";
import { allowedPrepHubPublicRoute } from "../../../utils/prephub-routes";
export default defineEventHandler(async (event) => {
  setResponseHeader(event, "Cache-Control", "private, no-store");
  setResponseHeader(event, "Referrer-Policy", "no-referrer");
  setResponseHeader(event, "X-Robots-Tag", "noindex, nofollow, noarchive");
  const path = getRouterParam(event, "path") ?? "";
  if (!allowedPrepHubPublicRoute(path, getMethod(event)))
    throw createError({
      statusCode: 404,
      statusMessage: "Shared workspace not found.",
    });
  if (path.includes("/resources/")) {
    const data = await requestAuthApi<ArrayBuffer>(
      event,
      `/prephub/public/${path}`,
      {
        query: { preview: getQuery(event).preview === "1" ? "1" : "0" },
        responseType: "arrayBuffer",
        onResponse({ response }) {
          if (response.ok)
            for (const name of [
              "Content-Type",
              "Content-Disposition",
              "Content-Length",
              "X-Content-Type-Options",
              "Content-Security-Policy",
            ]) {
              const value = response.headers.get(name);
              if (value) setResponseHeader(event, name, value);
            }
        },
      },
    );
    return new Uint8Array(data);
  }
  // No cookies or Authorization headers are forwarded; the token grants read-only access.
  return requestAuthApi(event, `/prephub/public/${path}`);
});
