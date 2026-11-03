import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const id = "00000000-0000-4000-8000-000000000001";
const mediaId = "00000000-0000-4000-8000-000000000002";
function fixture(filename: string) {
  const calls: Array<{ kind: string; target: string; options?: any }> = [];
  let tokenReads = 0;
  const module = { exports: {} as any };
  const source = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", "defineEventHandler", source)((name: string) => {
    if (name === "h3") return {
      createError: (value: unknown) => value,
      getRouterParam: (event: any, key: string) => event.params[key],
      getHeader: (event: any, key: string) => event.headers[key],
      setResponseHeader: (event: any, key: string, value: string) => { event.response[key] = value; },
      proxyRequest: (_event: unknown, target: string, options: unknown) => { calls.push({ kind: "stream", target, options }); return "proxied"; },
    };
    if (name.endsWith("/utils/auth")) return {
      apiBaseUrl: () => "https://api.example.test",
      getFreshAccessToken: async () => { tokenReads++; return "dummy-owner-token"; },
      requestAuthenticatedApi: (_event: unknown, target: string) => { calls.push({ kind: "authenticated", target }); return { id }; },
    };
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports, (handler: unknown) => handler);
  return { handle: module.exports.default, calls, tokenReads: () => tokenReads };
}
const event = () => ({ params: { id, mediaId }, headers: { "content-type": "multipart/form-data; boundary=test", "content-length": "1000" }, response: {} as Record<string, string> });

test("owner edit reads and preview photos require account authentication and remain private", async () => {
  const read = fixture("server/api/moments/[id]/edit/index.get.ts");
  const current = event();
  await read.handle(current);
  assert.equal(read.calls[0]!.kind, "authenticated");
  assert.equal(read.calls[0]!.target, `/moments/${id}/edit`);
  assert.equal(current.response["Cache-Control"], "private, no-store");
  const photo = fixture("server/api/moments/[id]/edit/media/[mediaId].get.ts");
  await photo.handle(event());
  assert.equal(photo.tokenReads(), 1);
  assert.equal(photo.calls[0]!.target, `https://api.example.test/moments/${id}/edit/media/${mediaId}`);
  assert.equal(photo.calls[0]!.options.headers.Authorization, "Bearer dummy-owner-token");
  assert.equal(photo.calls[0]!.options.headers.Cookie, "");
});

test("atomic multipart edits refresh auth before streaming without replaying or buffering the body", async () => {
  const edit = fixture("server/api/moments/[id]/edit/index.put.ts");
  const current = event();
  assert.equal(await edit.handle(current), "proxied");
  assert.equal(edit.tokenReads(), 1);
  assert.equal(edit.calls.length, 1);
  assert.equal(edit.calls[0]!.options.streamRequest, true);
  assert.equal(edit.calls[0]!.options.headers.Cookie, "");
  assert.equal(current.response["Cache-Control"], "private, no-store");
});

test("invalid edit IDs, wrong body formats and excessive photo batches never reach the API", async () => {
  const edit = fixture("server/api/moments/[id]/edit/index.put.ts");
  const malformed = event(); malformed.params.id = "../other";
  await assert.rejects(edit.handle(malformed), { statusCode: 404 });
  const wrong = event(); wrong.headers["content-type"] = "application/json";
  await assert.rejects(edit.handle(wrong), { statusCode: 415 });
  const large = event(); large.headers["content-length"] = "4000001";
  await assert.rejects(edit.handle(large), { statusCode: 413 });
  assert.equal(edit.tokenReads(), 0);
  assert.equal(edit.calls.length, 0);
});
