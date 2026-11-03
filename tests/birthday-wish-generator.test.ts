import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { effectScope, reactive, ref } from "vue";
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc";
import { useBirthdayWishGenerator } from "../app/composables/useBirthdayWishGenerator.ts";

const wish = { title: "Happy birthday!", message: "Have a wonderful day!", secretMessage: "You make every day brighter." };
function fixture() {
  const input = reactive({ recipientName: "Sophea", relationship: "friend", tone: "warm", language: "en" as "en" | "km", context: "" });
  const session = ref<string | null>("first-user");
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  let signal!: AbortSignal;
  let submitted: unknown;
  const scope = effectScope();
  const state = scope.run(() => useBirthdayWishGenerator({
    input: () => ({ ...input }), session: () => session.value,
    request: (body, nextSignal) => {
      signal = nextSignal;
      submitted = body;
      return new Promise((ok, fail) => { resolve = ok; reject = fail; });
    },
  }))!;
  return { input, session, scope, state, resolve: (value: unknown) => resolve(value), reject: (error: unknown) => reject(error), signal: () => signal, submitted: () => submitted };
}

test("birthday wishes require a session and complete bounded preferences", async () => {
  const f = fixture();
  try {
    f.session.value = null;
    assert.equal(f.state.canGenerate.value, false);
    await f.state.generate();
    assert.equal(f.submitted(), undefined);
    f.session.value = "user";
    f.input.relationship = "   ";
    assert.equal(f.state.canGenerate.value, false);
    f.input.relationship = "mentor";
    f.input.tone = "x".repeat(121);
    assert.equal(f.state.canGenerate.value, false);
  } finally { f.scope.stop(); }
});

test("generation only previews a validated result until explicitly requested for application", async () => {
  const f = fixture();
  try {
    const pending = f.state.generate();
    assert.equal(f.state.loading.value, true);
    assert.equal(f.state.getApplicableWish(), null);
    f.resolve(wish);
    await pending;
    assert.deepEqual(f.state.result.value, wish);
    assert.deepEqual(f.state.getApplicableWish(), wish);
    assert.deepEqual(f.submitted(), { ...f.input });
  } finally { f.scope.stop(); }
});

for (const changed of ["recipientName", "relationship", "tone", "language", "context", "session"] as const) {
  test(`changing ${changed} clears a completed result and cannot apply it`, async () => {
    const f = fixture();
    try {
      const pending = f.state.generate(); f.resolve(wish); await pending;
      if (changed === "session") f.session.value = "another-user";
      else if (changed === "language") f.input.language = "km";
      else f.input[changed] = "changed";
      assert.equal(f.state.result.value, null);
      assert.equal(f.state.getApplicableWish(), null);
    } finally { f.scope.stop(); }
  });
}

for (const outcome of ["success", "error", "unmount"] as const) {
  test(`late ${outcome} cannot restore stale output or errors after preferences change`, async () => {
    const f = fixture();
    try {
      const pending = f.state.generate();
      if (outcome === "unmount") f.scope.stop();
      else { f.input.tone = "formal"; f.input.tone = "warm"; }
      assert.equal(f.signal().aborted, true);
      if (outcome === "error") f.reject(new Error("old failure"));
      else f.resolve(wish);
      await pending;
      assert.equal(f.state.result.value, null);
      assert.equal(f.state.error.value, "");
      assert.equal(f.state.loading.value, false);
    } finally { f.scope.stop(); }
  });
}

test("malformed output is rejected and safe HTTP states are exposed without provider messages", async () => {
  for (const failure of [{ invalidResult: true }, { statusCode: 401 }, { statusCode: 429 }, { statusCode: 503, message: "sensitive details" }]) {
    const f = fixture();
    try {
      const pending = f.state.generate();
      if ("invalidResult" in failure) f.resolve({ ...wish, message: "" });
      else f.reject(failure);
      await pending;
      assert.equal(f.state.result.value, null);
      assert.equal(f.state.error.value, "statusCode" in failure && failure.statusCode === 401 ? "auth" : "statusCode" in failure && failure.statusCode === 429 ? "rate-limit" : "unavailable");
    } finally { f.scope.stop(); }
  }
});

test("birthday panel compiles and keeps generated text behind an explicit apply action", () => {
  const filename = "app/components/moments/BirthdayWishGenerator.vue";
  const source = readFileSync(new URL(`../${filename}`, import.meta.url), "utf8");
  const { descriptor, errors } = parse(source, { filename });
  assert.deepEqual(errors, []);
  const script = compileScript(descriptor, { id: "birthday-wish-test" });
  const template = compileTemplate({ source: descriptor.template!.content, filename, id: "birthday-wish-test", compilerOptions: { bindingMetadata: script.bindings } });
  assert.deepEqual(template.errors, []);
  assert.match(source, /ModernSelect/);
  assert.match(source, /getApplicableWish\(\)/);
  assert.match(source, /@click="applyWish"/);
});
