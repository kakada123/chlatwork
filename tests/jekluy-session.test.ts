import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as jekluy from "../app/lib/jekluy.ts";

function session(options: { saved?: string; denied?: boolean; navigator?: object } = {}) {
  const mounted: (() => void)[] = [];
  let saved = options.saved ?? null;
  const storage = {
    getItem() { if (options.denied) throw new Error("denied"); return saved; },
    setItem(_key: string, value: string) { if (options.denied) throw new Error("denied"); saved = value; },
  };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: options.navigator || {} });
  const module = { exports: {} as any };
  const source = readFileSync(new URL("../app/composables/useJekLuy.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((name: string) => {
    if (name === "vue") return { ...vue, onMounted: (fn: () => void) => mounted.push(fn) };
    if (name === "../lib/jekluy.ts") return jekluy;
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const scope = vue.effectScope();
  const state = scope.run(() => module.exports.useJekLuy());
  return {
    state,
    mount: () => mounted.forEach((fn) => fn()),
    saved: () => saved,
    close() {
      scope.stop();
      for (const [key, descriptor] of [["window", originalWindow], ["navigator", originalNavigator]] as const) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}

function fill(state: any) {
  state.draft.value.participants[0].name = "កក្កដា";
  state.draft.value.participants[0].amount = "10000";
  state.draft.value.participants[1].name = "ដាណែត";
  state.draft.value.participants[1].amount = "0";
}

test("draft is read only after mounting; editing and completed repayments survive refresh", async () => {
  const first = session();
  let saved = "";
  try {
    assert.equal(first.state.ready.value, false);
    assert.equal(first.saved(), null);
    first.mount();
    fill(first.state);
    const transfer = first.state.result.value.transfers[0];
    first.state.toggleCompleted(transfer.id);
    await vue.nextTick();
    saved = first.saved()!;
    assert.equal(JSON.parse(saved).participants[0].amount, "10000");
  } finally { first.close(); }
  const restored = session({ saved });
  try {
    restored.mount();
    assert.equal(restored.state.result.value.totalCents, 1_000_000n);
    assert.equal(restored.state.completedIds.value.length, 1);
    restored.state.draft.value.participants[0].amount = "20000";
    assert.deepEqual(restored.state.completedIds.value, []);
    restored.state.draft.value.participants[0].amount = "10000";
    assert.deepEqual(restored.state.completedIds.value, [], "Returning to a previous total must not resurrect paid marks");
  } finally { restored.close(); }
});

test("currency confirmation clears amounts only when accepted; cancel and reset preserve data until confirmed", () => {
  const app = session();
  try {
    app.mount();
    fill(app.state);
    app.state.requestCurrency("USD");
    assert.equal(app.state.draft.value.currency, "KHR");
    app.state.cancelPending();
    assert.equal(app.state.draft.value.participants[0].amount, "10000");
    app.state.requestCurrency("USD");
    app.state.confirmPending();
    assert.equal(app.state.draft.value.currency, "USD");
    assert.equal(app.state.draft.value.participants[0].name, "កក្កដា");
    assert.equal(app.state.draft.value.participants.every((person: any) => person.amount === ""), true);
    app.state.requestReset();
    app.state.cancelPending();
    assert.equal(app.state.draft.value.participants[0].name, "កក្កដា");
    app.state.requestReset();
    app.state.confirmPending();
    assert.deepEqual(app.state.draft.value, jekluy.createJekLuyDraft());
  } finally { app.close(); }
});

test("participant removal keeps two rows and addition never creates duplicate IDs", () => {
  const app = session();
  try {
    app.mount();
    app.state.removeParticipant("person-1");
    assert.equal(app.state.draft.value.participants.length, 2);
    for (let i = 0; i < 8; i++) app.state.addParticipant();
    app.state.removeParticipant("person-2");
    app.state.addParticipant();
    const ids = app.state.draft.value.participants.map((person: any) => person.id);
    assert.equal(new Set(ids).size, ids.length);
  } finally { app.close(); }
});

test("storage denial or corruption does not stop calculating or overwrite unreadable state before editing", async () => {
  for (const options of [{ saved: "broken" }, { denied: true }]) {
    const app = session(options);
    try {
      app.mount();
      assert.match(app.state.storageMessage.value, /[\u1780-\u17ff]/);
      if ("saved" in options) assert.equal(app.saved(), "broken");
      fill(app.state);
      await vue.nextTick();
      assert.equal(app.state.result.value.transfers.length, 1);
    } finally { app.close(); }
  }
});

test("sharing falls back to copying Khmer text; denied clipboard exposes selectable text", async () => {
  let copied = "";
  const app = session({ navigator: { clipboard: { writeText: async (text: string) => { copied = text; } } } });
  try {
    app.mount(); fill(app.state);
    await app.state.shareResult();
    assert.match(copied, /ដាណែត ត្រូវសង កក្កដា 5,000៛/);
    assert.match(app.state.shareMessage.value, /ចម្លង/);
  } finally { app.close(); }
  const denied = session({ navigator: { clipboard: { writeText: async () => { throw new Error("denied"); } } } });
  try {
    denied.mount(); fill(denied.state);
    await denied.state.copyResult();
    assert.match(denied.state.manualCopy.value, /ចែកលុយ/);
  } finally { denied.close(); }
});

test("native share cancellation is quiet and provider failure offers the copy fallback", async () => {
  for (const cancelled of [true, false]) {
    let copied = false;
    const app = session({ navigator: {
      share: async () => { throw Object.assign(new Error("not shared"), { name: cancelled ? "AbortError" : "NotAllowedError" }); },
      clipboard: { writeText: async () => { copied = true; } },
    } });
    try {
      app.mount(); fill(app.state);
      await app.state.shareResult();
      assert.equal(copied, !cancelled);
      assert.equal(app.state.shareMessage.value === "", cancelled);
    } finally { app.close(); }
  }
});

test("native sharing sends the current exact Khmer summary without a private URL", async () => {
  let payload: { title: string; text: string; url?: string } | undefined;
  const app = session({ navigator: { share: async (value: any) => { payload = value; } } });
  try {
    app.mount(); fill(app.state);
    await app.state.shareResult();
    assert.equal(payload?.title, "ចែកលុយ 💸");
    assert.match(payload!.text, /ដាណែត ត្រូវសង កក្កដា 5,000៛/);
    assert.equal(payload?.url, undefined);
    assert.equal(app.state.sharing.value, false);
    assert.match(app.state.shareMessage.value, /ចែករំលែក/);
  } finally { app.close(); }
});

test("KHR uses PayBack's separate leftover, persists explicit assignment and invalidates paid marks", async () => {
  const app = session();
  let saved = "";
  try {
    app.mount(); fill(app.state);
    const id = app.state.addParticipant();
    app.state.draft.value.participants.find((person: any) => person.id === id).name = "វិសាល";
    assert.equal(app.state.result.value.remainderMode, "LEFTOVER_ONLY");
    assert.equal(app.state.result.value.remainderPersonId, null);
    assert.deepEqual(app.state.result.value.transfers.map((transfer: any) => transfer.amountCents), [330_000n, 330_000n]);
    app.state.toggleCompleted(app.state.result.value.transfers[0].id);
    app.state.draft.value.remainderMode = "ASSIGN_TO_PERSON";
    assert.deepEqual(app.state.completedIds.value, []);
    app.state.draft.value.remainderPayer = "person-2";
    assert.equal(app.state.result.value.remainderPersonId, "person-2");
    assert.equal(app.state.result.value.people.reduce((sum: bigint, person: any) => sum + person.balanceCents, 0n), 0n);
    app.state.toggleCompleted(app.state.result.value.transfers[0].id);
    await vue.nextTick();
    saved = app.saved()!;
  } finally { app.close(); }
  const restored = session({ saved });
  try {
    restored.mount();
    assert.equal(restored.state.draft.value.remainderMode, "ASSIGN_TO_PERSON");
    assert.equal(restored.state.result.value.remainderPersonId, "person-2");
    assert.equal(restored.state.completedIds.value.length, 1);
    restored.state.draft.value.remainderMode = "LEFTOVER_ONLY";
    assert.deepEqual(restored.state.completedIds.value, []);
  } finally { restored.close(); }
});
