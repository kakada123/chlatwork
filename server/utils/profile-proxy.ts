import {
  createError,
  getHeader,
  getMethod,
  type H3Event,
} from "h3";
import { trustedRequestOrigin } from "./product-domain";

export function assertProfileRequestOrigin(event: H3Event) {
  if (getMethod(event) === "GET") return;
  const origin = getHeader(event, "origin");
  const expectedOrigin = trustedRequestOrigin(event);
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
