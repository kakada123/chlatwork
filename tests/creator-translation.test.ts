import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

// Exercise the browser service without booting Nuxt or reading local configuration.
const { outputText } = ts.transpileModule(
  readFileSync(
    new URL("../app/services/creator-ai.service.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  },
);
const service = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("all four conversions submit trimmed content with an idempotency key and fixed direction", async () => {
  const runtime = globalThis as typeof globalThis & {
    $fetch?: (...args: any[]) => Promise<unknown>;
  };
  const previous = runtime.$fetch;
  const calls: any[] = [];
  const response = {
    data: { title: "Translation", sections: [] },
    usage: { creditsCharged: 1, creditsRemaining: 19 },
  };
  runtime.$fetch = async (...args) => {
    calls.push(args);
    return response;
  };
  try {
    for (const direction of [
      "khmer-to-latin",
      "khmer-to-english",
      "latin-to-english",
      "english-to-latin",
    ]) {
      const result = await service.runCreatorGeneration(direction, {
        text: "  nh jol jit  ",
        language: "Khmer",
        tone: "Natural Khmer",
      });
      const [url, options] = calls.at(-1);
      assert.equal(url, `/api/creator-ai/khmer/${direction}`);
      assert.equal(options.method, "POST");
      assert.deepEqual(options.body, { content: "nh jol jit" });
      assert.match(options.headers["Idempotency-Key"], /^[0-9a-f-]{36}$/);
      assert.deepEqual(result, response);
    }
    assert.equal(calls.length, 4);
    assert.equal(
      new Set(calls.map(([, options]) => options.headers["Idempotency-Key"]))
        .size,
      4,
    );
  } finally {
    runtime.$fetch = previous;
  }
});
