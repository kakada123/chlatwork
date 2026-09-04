import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CREATOR_CATEGORIES,
  CREATOR_ROUTE_PATHS,
  CREATOR_TOOLS,
  estimateCreatorCredits,
} from "../app/data/creator-tools.ts";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Creator registry exposes every requested workflow with unique nested routes", () => {
  assert.equal(CREATOR_CATEGORIES.length, 4);
  assert.equal(CREATOR_TOOLS.length, 15);
  assert.equal(
    new Set(CREATOR_TOOLS.map((tool) => tool.id)).size,
    CREATOR_TOOLS.length,
  );
  assert.equal(
    new Set(CREATOR_TOOLS.map((tool) => tool.route)).size,
    CREATOR_TOOLS.length,
  );
  assert.ok(
    CREATOR_TOOLS.every((tool) =>
      tool.route.startsWith(`/creator/${tool.category}/`),
    ),
  );
  assert.equal(CREATOR_ROUTE_PATHS.length, CREATOR_TOOLS.length + 1);
  assert.equal(
    CREATOR_TOOLS.find((tool) => tool.id === "video-content-pack")?.featured,
    true,
  );
});

test("Creator credits use fixed or duration-based estimates without token language", () => {
  assert.equal(estimateCreatorCredits({ type: "fixed", credits: 2 }), 2);
  assert.equal(
    estimateCreatorCredits({ type: "video", minimum: 5, perMinute: 5 }),
    5,
  );
  assert.equal(
    estimateCreatorCredits({ type: "video", minimum: 5, perMinute: 5 }, 154),
    15,
  );
  assert.doesNotMatch(
    read("app/data/creator-tools.ts"),
    /tokens?\s+(remaining|cost)|OpenAI token/i,
  );
  const fixedPrices = Object.fromEntries(
    CREATOR_TOOLS.filter((tool) => tool.creditCost.type === "fixed").map(
      (tool) => [tool.id, tool.creditCost.type === "fixed" ? tool.creditCost.credits : 0],
    ),
  );
  assert.deepEqual(fixedPrices, {
    "create-post": 2,
    "script-generator": 4,
    "hook-generator": 1,
    "content-ideas": 2,
    "facebook-to-tiktok": 2,
    "long-to-short": 2,
    "khmer-grammar": 1,
    "khmer-rewrite": 1,
    "latin-to-khmer": 1,
    "khmer-humanize": 1,
  });
});

test("Creator UI is discoverable through existing navigation without changing mobile dock slots", () => {
  const layout = read("app/layouts/default.vue");
  const mobileTools = read("app/components/tools/MobileToolsDirectory.vue");
  const bottomNav = read("app/components/layout/MobileBottomNav.vue");

  assert.match(layout, /to="\/creator"/);
  assert.match(layout, /CREATOR_TOOLS/);
  assert.match(mobileTools, /ChlatWork Creator/);
  assert.doesNotMatch(bottomNav, /Creator/);
});

test("Creator provider calls stay isolated behind authenticated server boundaries", () => {
  const service = read("app/services/creator-ai.service.ts");
  const toolPage = read("app/pages/creator/[...slug].vue");
  const gateway = read("api/src/creator-ai/creator-ai-gateway.service.ts");
  const proxy = read("server/api/creator-ai/[...path].ts");

  for (const endpoint of [
    "posts/generate",
    "scripts/generate",
    "hooks/generate",
    "content-ideas/generate",
    "video/content-pack",
  ]) {
    assert.match(service, new RegExp(endpoint));
  }

  assert.doesNotMatch(
    service,
    /api\.openai\.com|OPENAI_API_KEY|chlatwork_access_token|chlatwork_refresh_token/i,
  );
  assert.match(service, /video\/upload-ticket/);
  assert.match(service, /Bearer \$\{ticket\.ticket\}/);
  assert.doesNotMatch(toolPage, /\$fetch|fetch\(/);
  assert.match(gateway, /from 'openai'/);
  assert.match(gateway, /maxRetries: 0/);
  assert.match(proxy, /getFreshAccessToken/);
  assert.match(proxy, /streamRequest: true/);
});

test("Creator surfaces generation, video, result, and insufficient-credit states", () => {
  const composable = read("app/composables/useCreatorTool.ts");
  const result = read("app/components/creator/CreatorResult.vue");
  const credits = read("app/components/creator/CreatorInsufficientCredits.vue");
  const upload = read("app/components/creator/CreatorVideoUpload.vue");

  for (const state of [
    "idle",
    "ready",
    "generating",
    "success",
    "error",
    "insufficient-credits",
    "rate-limited",
    "unavailable",
    "auth-required",
  ]) {
    assert.match(composable, new RegExp(`"${state}"`));
  }
  assert.match(result, /Copy all/);
  assert.match(result, /New variation/);
  assert.match(
    credits,
    /Processing has not started and no credits were deducted/,
  );
  assert.match(composable, /Extracting audio/);
  assert.match(composable, /Queued/);
  assert.match(upload, /activeStage/);
  assert.doesNotMatch(upload, /\d+%|progress.*percent/i);
});
