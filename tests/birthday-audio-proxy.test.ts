import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as h3 from "h3";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function proxyFixture(trackId: string) {
  const upstream: Array<{ url: string; method: string; headers: Headers }> = [];
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync("server/api/moments/birthday-audio/[trackId].get.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fakeFetch = async (url: string, options: RequestInit) => {
    const headers = new Headers(options.headers);
    upstream.push({ url, headers, method: options.method ?? "GET" });
    return new Response(options.method === "HEAD" ? null : new Uint8Array([1, 2, 3, 4]), {
      status: options.method === "HEAD" ? 200 : 206,
      headers: { "Content-Type": "audio/mp4", "Content-Length": "4", "Accept-Ranges": "bytes", "Content-Range": "bytes 0-3/100", "Cache-Control": "public, max-age=86400" },
    });
  };
  new Function("require", "module", "exports", "defineEventHandler", code)(
    (name: string) => {
      if (name === "../../../utils/auth") return { apiBaseUrl: () => "https://api.example.test" };
      if (name === "h3") return { ...h3, proxyRequest: (event: h3.H3Event, target: string, options: h3.ProxyOptions) => h3.proxyRequest(event, target, { ...options, fetch: fakeFetch as typeof fetch }) };
      throw new Error(`Unexpected dependency ${name}`);
    }, module, module.exports, (handler: unknown) => handler,
  );
  const app = h3.createApp();
  app.use(h3.defineEventHandler((event) => {
    event.context.params = { trackId };
    return module.exports.default(event);
  }));
  return { handle: h3.toWebHandler(app), upstream };
}

test("audio proxy streams byte ranges and their length without forwarding account cookies", async () => {
  const proxy = proxyFixture("hbd-001");
  const response = await proxy.handle(new Request("https://example.test/api/moments/birthday-audio/hbd-001", {
    headers: { Range: "bytes=0-3", Cookie: "dummy-session=private", Authorization: "Bearer dummy-private-token" },
  }));
  assert.equal(response.status, 206);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3, 4]));
  assert.equal(response.headers.get("content-length"), "4");
  assert.equal(response.headers.get("content-range"), "bytes 0-3/100");
  assert.equal(proxy.upstream[0]!.url, "https://api.example.test/moments/birthday-audio/hbd-001");
  assert.equal(proxy.upstream[0]!.headers.get("range"), "bytes=0-3");
  assert.equal(proxy.upstream[0]!.headers.get("authorization"), "");
  assert.equal(proxy.upstream[0]!.headers.get("cookie"), "");
});

test("audio proxy preserves HEAD and rejects malformed IDs before contacting Railway", async () => {
  const proxy = proxyFixture("hbd-001");
  const response = await proxy.handle(new Request("https://example.test/audio", { method: "HEAD" }));
  assert.equal(response.status, 200);
  assert.equal((await response.arrayBuffer()).byteLength, 0);
  assert.equal(proxy.upstream[0]!.method, "HEAD");
  for (const id of ["../private", "hbd-001?token=bad", "https://untrusted.test"]) {
    const invalid = proxyFixture(id);
    const rejected = await invalid.handle(new Request("https://example.test/audio"));
    assert.equal(rejected.status, 404);
    assert.equal(invalid.upstream.length, 0);
  }
});
