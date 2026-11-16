import assert from "node:assert/strict";
import test from "node:test";
import {
  inputToInstant,
  instantToInput,
  inlineParts,
  safeExternalUrl,
} from "../app/lib/prephub.ts";
import { allowedPrepHubRoute } from "../server/utils/prephub-routes.ts";

test("dates round trip through the saved account time zone rather than the device zone", () => {
  assert.equal(
    inputToInstant("2026-11-17T02:00", "Asia/Phnom_Penh"),
    "2026-11-16T19:00:00.000Z",
  );
  assert.equal(
    instantToInput("2026-11-16T19:00:00Z", "Asia/Phnom_Penh"),
    "2026-11-17T02:00",
  );
  assert.equal(inputToInstant("", "Asia/Phnom_Penh"), null);
  assert.throws(() => inputToInstant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => inputToInstant("2026-02-30T02:00", "Asia/Phnom_Penh"));
});
test("basic formatting produces text tokens without rendering arbitrary HTML", () => {
  assert.deepEqual(inlineParts("**Ready** and `safe`"), [
    { text: "Ready", type: "strong" },
    { text: " and ", type: "text" },
    { text: "safe", type: "code" },
  ]);
  assert.deepEqual(inlineParts("<img src=x onerror=alert(1)>"), [
    { text: "<img src=x onerror=alert(1)>", type: "text" },
  ]);
  assert.equal(safeExternalUrl("javascript:alert(1)"), "");
  assert.equal(safeExternalUrl("https://example.com"), "https://example.com/");
});
test("proxy allowlist limits route shapes and HTTP methods", () => {
  const s = "11111111-1111-4111-8111-111111111111";
  assert.equal(allowedPrepHubRoute("subjects", "GET"), true);
  assert.equal(
    allowedPrepHubRoute(`subjects/${s}/sections/${s}/items/${s}`, "PATCH"),
    true,
  );
  assert.equal(
    allowedPrepHubRoute(`subjects/${s}/resources/${s}`, "GET"),
    true,
  );
  assert.equal(allowedPrepHubRoute("../admin", "GET"), false);
  assert.equal(allowedPrepHubRoute("dashboard", "POST"), false);
  assert.equal(
    allowedPrepHubRoute(`subjects/${s}/sections/${s}/resources`, "DELETE"),
    false,
  );
  assert.equal(allowedPrepHubRoute("subjects/not-a-uuid", "GET"), false);
});

test("repeated daylight-saving times choose the earlier occurrence even with half-hour transitions", () => {
  assert.equal(
    inputToInstant("2026-04-05T01:45", "Australia/Lord_Howe"),
    "2026-04-04T14:45:00.000Z",
  );
  assert.equal(
    inputToInstant("2026-11-01T01:30", "America/New_York"),
    "2026-11-01T05:30:00.000Z",
  );
});
