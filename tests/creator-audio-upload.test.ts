import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

// Compile the Nuxt service's types and parameter properties without booting Nuxt
// or loading environment files. Requests below are entirely in-memory stubs.
const source = readFileSync(
  new URL("../app/services/creator-ai.service.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const service = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("unprepared video never requests a ticket or uploads a file", async () => {
  const runtime = globalThis as typeof globalThis & {
    $fetch?: (...args: unknown[]) => unknown;
  };
  const previous = runtime.$fetch;
  let calls = 0;
  runtime.$fetch = () => {
    calls++;
    throw new Error("Unexpected network request");
  };
  try {
    await assert.rejects(
      service.runCreatorGeneration("video-subtitle", {
        file: new File(["video"], "clip.mp4", { type: "video/mp4" }),
      }),
      { code: "INVALID_VIDEO" },
    );
    assert.equal(calls, 0);
  } finally {
    runtime.$fetch = previous;
  }
});

test("prepared audio uploads through the existing ticket with one idempotency key", async () => {
  const runtime = globalThis as typeof globalThis & {
    $fetch?: (...args: unknown[]) => unknown;
  };
  const previous = runtime.$fetch;
  const requests: {
    url: string;
    options: { headers: Record<string, string>; body: unknown };
  }[] = [];
  runtime.$fetch = async (...args: unknown[]) => {
    const [url, options] = args as [
      string,
      (typeof requests)[number]["options"],
    ];
    requests.push({ url, options });
    if (requests.length === 1)
      return {
        uploadUrl: "https://upload.example.test/audio",
        ticket: "dummy-upload-ticket",
      };
    return {
      data: {
        status: "COMPLETED",
        stage: "COMPLETED",
        result: { title: "Subtitles", sections: [] },
      },
      usage: { creditsCharged: 5, creditsRemaining: 15 },
    };
  };
  try {
    const file = new File(["audio-only"], "clip.m4a", { type: "audio/mp4" });
    const stages: string[] = [];
    const result = await service.runCreatorGeneration(
      "video-subtitle",
      { file, language: "Khmer", tone: "Natural" },
      {
        onVideoStage: (stage: string) => stages.push(stage),
      },
    );
    assert.equal(requests.length, 2);
    assert.equal(requests[0]!.url, "/api/creator-ai/video/upload-ticket");
    assert.equal(requests[1]!.url, "https://upload.example.test/audio");
    assert.equal(
      requests[0]!.options.headers["Idempotency-Key"],
      requests[1]!.options.headers["Idempotency-Key"],
    );
    const form = requests[1]!.options.body as FormData;
    const uploaded = form.get("file") as File;
    assert.equal(uploaded.type, "audio/mp4");
    assert.equal(await uploaded.text(), "audio-only");
    assert.equal(form.get("language"), "KHMER");
    assert.deepEqual(stages, ["UPLOADING", "COMPLETED"]);
    assert.equal(result.usage.creditsCharged, 5);
  } finally {
    runtime.$fetch = previous;
  }
});
