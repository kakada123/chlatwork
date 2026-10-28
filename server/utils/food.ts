import { getCookie, type H3Event } from "h3";
import { requestAuthenticatedApi, requestAuthApi } from "./auth";

// A present session is verified/refreshed before generation; guests retain the public discovery flow.
export function requestFoodApi<T>(
  event: H3Event,
  path: string,
  options: Parameters<typeof $fetch<T>>[1] = {},
) {
  return getCookie(event, "chlatwork_access_token") ||
    getCookie(event, "chlatwork_refresh_token")
    ? requestAuthenticatedApi<T>(event, path, options)
    : requestAuthApi<T>(event, path, options);
}
