import {
  createError,
  getHeader,
  getMethod,
  getRequestURL,
  type H3Event,
} from "h3";

export function assertProfileRequestOrigin(event: H3Event) {
  if (getMethod(event) === "GET") return;
  const origin = getHeader(event, "origin");
  const configuredOrigin = useRuntimeConfig(event).appOrigin;
  const expectedOrigin = configuredOrigin || getRequestURL(event).origin;
  if (
    getHeader(event, "sec-fetch-site") === "cross-site" ||
    (origin && origin !== expectedOrigin)
  ) {
    throw createError({
      statusCode: 403,
      statusMessage: "Use ChlatWork to update this page.",
    });
  }
}
