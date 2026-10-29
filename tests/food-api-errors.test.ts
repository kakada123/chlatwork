import assert from "node:assert/strict";
import test from "node:test";
import type { H3Event } from "h3";
import { requestAuthApi } from "../server/utils/auth.ts";

test("the API bridge forwards only the public Places quota code on Food routes", async () => {
  const runtime = globalThis as typeof globalThis & {
    useRuntimeConfig?: () => { authApiBaseUrl: string };
    $fetch?: (...args: unknown[]) => Promise<unknown>;
  };
  const previousConfig = runtime.useRuntimeConfig;
  const previousFetch = runtime.$fetch;
  runtime.useRuntimeConfig = () => ({ authApiBaseUrl: "https://api.example.test" });
  try {
    for (const [path, status, code, expected] of [
      ["/food/recommend", 503, "FOOD_PLACES_RATE_LIMITED", { code: "FOOD_PLACES_RATE_LIMITED" }],
      ["/food/pick", 503, "FOOD_PLACES_RATE_LIMITED", { code: "FOOD_PLACES_RATE_LIMITED" }],
      ["/auth/me", 503, "FOOD_PLACES_RATE_LIMITED", undefined],
      ["/food/recommend", 400, "FOOD_PLACES_RATE_LIMITED", undefined],
      ["/food/recommend", 503, "untrusted-provider-text", undefined],
    ] as const) {
      runtime.$fetch = async () => {
        throw { response: { status, _data: {
          code, message: "Safe public error", diagnostic: "dummy-private-detail",
        } } };
      };
      const failure = await requestAuthApi({} as H3Event, path).catch((error: unknown) => error);
      assert.equal((failure as { statusCode: number }).statusCode, status);
      assert.deepEqual((failure as { data?: unknown }).data, expected);
      assert.ok(!JSON.stringify(failure).includes("dummy-private-detail"));
    }
  } finally {
    if (previousConfig) runtime.useRuntimeConfig = previousConfig;
    else delete runtime.useRuntimeConfig;
    if (previousFetch) runtime.$fetch = previousFetch;
    else delete runtime.$fetch;
  }
});
