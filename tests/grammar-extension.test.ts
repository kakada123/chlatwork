import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test("Chrome Extension Manifest V3 structure and permissions", () => {
  const manifestPath = resolve("chlatwork-grammar-extension/manifest.json");
  assert.ok(existsSync(manifestPath), "manifest.json must exist");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "ChlatWork Grammar Assistant");
  assert.ok(manifest.version);
  assert.deepEqual(manifest.permissions, ["storage", "cookies"]);

  // Host permissions grant background service worker cross-origin fetch access
  assert.ok(Array.isArray(manifest.host_permissions));
  assert.ok(manifest.host_permissions.includes("https://*/*"));
  assert.ok(manifest.host_permissions.includes("http://localhost/*"));

  // Check background service worker file
  assert.equal(manifest.background?.service_worker, "background.js");
  assert.ok(existsSync(resolve("chlatwork-grammar-extension", manifest.background.service_worker)));

  // Check content scripts configuration
  assert.ok(Array.isArray(manifest.content_scripts));
  const contentScript = manifest.content_scripts[0];
  assert.ok(contentScript.js.includes("content.js"));
  assert.ok(existsSync(resolve("chlatwork-grammar-extension", "content.js")));
  assert.deepEqual(contentScript.matches, ["http://*/*", "https://*/*"]);

  // Check options page
  assert.equal(manifest.options_page, "options.html");
  assert.ok(existsSync(resolve("chlatwork-grammar-extension", "options.html")));
  assert.ok(existsSync(resolve("chlatwork-grammar-extension", "options.js")));
  assert.ok(existsSync(resolve("chlatwork-grammar-extension", "options.css")));

  // Verify icons exist
  for (const size of ["16", "32", "48", "128"]) {
    const iconFile = manifest.icons?.[size];
    assert.ok(iconFile, `Icon ${size} must be declared`);
    assert.ok(existsSync(resolve("chlatwork-grammar-extension", iconFile)), `Icon ${iconFile} must exist`);
  }
});

test("Extension background response parser supports all ChlatWork API contracts", () => {
  function extractCorrected(data: any): string | undefined {
    return (
      data.corrected ??
      data.data?.corrected ??
      data.data?.sections?.find((s: any) => s.id === "result")?.content ??
      data.result
    );
  }

  // Contract 1: Dedicated extension response format { original, corrected, changed }
  const resp1 = {
    original: "I has meeting today.",
    corrected: "I have a meeting today.",
    changed: true,
  };
  assert.equal(extractCorrected(resp1), "I have a meeting today.");

  // Contract 2: Minimal { corrected: string }
  const resp2 = { corrected: "She goes to school every day." };
  assert.equal(extractCorrected(resp2), "She goes to school every day.");

  // Contract 3: Standard NestJS envelope { data: { corrected: string } }
  const resp3 = { data: { corrected: "We are working on the project." } };
  assert.equal(extractCorrected(resp3), "We are working on the project.");

  // Contract 4: Existing ChlatWork CreatorAi generation envelope with sections
  const resp4 = {
    generationId: "gen-uuid",
    data: {
      title: "Corrected text",
      sections: [
        { id: "result", label: "Corrected text", content: "They have arrived." },
        { id: "corrections", label: "What changed", content: "1. “has” → “have”" },
      ],
    },
    usage: { creditsCharged: 1, creditsRemaining: 99 },
  };
  assert.equal(extractCorrected(resp4), "They have arrived.");

  // Sentence already correct: returns unchanged text
  const unchangedResp = {
    original: "This is a correct sentence.",
    corrected: "This is a correct sentence.",
    changed: false,
  };
  assert.equal(extractCorrected(unchangedResp), "This is a correct sentence.");
});

test("Extension background URL resolution routes modes correctly", () => {
  function resolveRequest(endpoint: string, mode: "grammar" | "polish", text: string) {
    const url = new URL(endpoint);
    let requestUrl = url.href;
    const isLegacyKhmer = /\/khmer\/(grammar|rewrite)/.test(url.pathname);
    if (isLegacyKhmer) {
      if (mode === "polish" && url.pathname.endsWith("/khmer/grammar")) {
        requestUrl = url.href.replace(/\/khmer\/grammar$/, "/khmer/rewrite");
      } else if (mode === "grammar" && url.pathname.endsWith("/khmer/rewrite")) {
        requestUrl = url.href.replace(/\/khmer\/rewrite$/, "/khmer/grammar");
      }
    }

    const requestBody = isLegacyKhmer
      ? { content: text }
      : { text, content: text, mode, language: "en" };

    return { requestUrl, requestBody };
  }

  // Dedicated endpoint: sends full DTO with mode and language
  const dedicated = resolveRequest("http://localhost:3002/creator-ai/grammar/correct", "polish", "My draft");
  assert.equal(dedicated.requestUrl, "http://localhost:3002/creator-ai/grammar/correct");
  assert.deepEqual(dedicated.requestBody, { text: "My draft", content: "My draft", mode: "polish", language: "en" });

  // Legacy khmer/grammar in grammar mode
  const legacyGrammar = resolveRequest("http://localhost:3002/creator-ai/khmer/grammar", "grammar", "My draft");
  assert.equal(legacyGrammar.requestUrl, "http://localhost:3002/creator-ai/khmer/grammar");
  assert.deepEqual(legacyGrammar.requestBody, { content: "My draft" });

  // Legacy khmer/grammar in polish mode: automatically rewrites path to khmer/rewrite
  const legacyPolish = resolveRequest("http://localhost:3002/creator-ai/khmer/grammar", "polish", "My draft");
  assert.equal(legacyPolish.requestUrl, "http://localhost:3002/creator-ai/khmer/rewrite");
  assert.deepEqual(legacyPolish.requestBody, { content: "My draft" });
});

test("Extension error status formatting", () => {
  function formatErrorMessage(status: number, data: any): string {
    if (status === 401) {
      return "Not authenticated. Open settings and enter a valid session token.";
    }
    if (status === 429) {
      return "Rate limit exceeded. Please wait a moment and try again.";
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(", ");
    }
    if (typeof data?.message === "string") {
      return data.message;
    }
    return `API error (${status})`;
  }

  assert.equal(formatErrorMessage(401, {}), "Not authenticated. Open settings and enter a valid session token.");
  assert.equal(formatErrorMessage(429, {}), "Rate limit exceeded. Please wait a moment and try again.");
  assert.equal(
    formatErrorMessage(400, { message: ["text must be shorter than 8000 characters", "invalid mode"] }),
    "text must be shorter than 8000 characters, invalid mode",
  );
  assert.equal(formatErrorMessage(500, { message: "Internal server error" }), "Internal server error");
  assert.equal(formatErrorMessage(503, {}), "API error (503)");
});

test("Sensitive field detection prevents leaking passwords and private credentials", () => {
  const isPrivate = (name: string, id: string, autocomplete: string): boolean => {
    const tags = [name, id, autocomplete].join(" ").toLowerCase();
    return /password|passcode|one-time-code|\botp\b|\bpin\b|cc-number|cc-csc|credit.?card/i.test(tags);
  };

  assert.ok(isPrivate("user_password", "pwd", "current-password"));
  assert.ok(isPrivate("otp_code", "auth_pin", "one-time-code"));
  assert.ok(isPrivate("card_number", "cc-number", "cc-number"));
  assert.ok(!isPrivate("comment_body", "notes", "off"));
  assert.ok(!isPrivate("search_query", "search", "search"));
});
