import assert from "node:assert/strict";
import test from "node:test";
import type { H3Event } from "h3";
import { requestAuthApi } from "../server/utils/auth.ts";

test("the API bridge forwards only the recognized YouTube error code on downloader routes", async () => {
  const runtime = globalThis as typeof globalThis & {
    useRuntimeConfig?: () => { authApiBaseUrl: string };
    $fetch?: (...args: unknown[]) => Promise<unknown>;
  };
  const previousConfig = runtime.useRuntimeConfig;
  const previousFetch = runtime.$fetch;
  runtime.useRuntimeConfig = () => ({ authApiBaseUrl: "https://api.example.test" });
  try {
    for (const [path, code, expected] of [
      ["/youtube-downloader/preview", "UPSTREAM_AUTH_REQUIRED", { code: "UPSTREAM_AUTH_REQUIRED" }],
      ["/auth/me", "UPSTREAM_AUTH_REQUIRED", undefined],
      ["/youtube-downloader/preview", "untrusted-provider-text", undefined],
    ] as const) {
      runtime.$fetch = async () => {
        throw {
          response: {
            status: 502,
            _data: {
              code,
              message: "Safe public error",
              diagnostic: "https://example.test/private?token=dummy-private-value",
            },
          },
        };
      };
      const failure = await requestAuthApi({} as H3Event, path).catch((error: unknown) => error);
      assert.equal((failure as { statusCode: number }).statusCode, 502);
      assert.deepEqual((failure as { data?: unknown }).data, expected);
      assert.ok(!JSON.stringify(failure).includes("dummy-private-value"));
    }
  } finally {
    if (previousConfig) runtime.useRuntimeConfig = previousConfig;
    else delete runtime.useRuntimeConfig;
    if (previousFetch) runtime.$fetch = previousFetch;
    else delete runtime.$fetch;
  }
});
