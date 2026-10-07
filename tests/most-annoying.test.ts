import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import {
  compileScript,
  compileStyle,
  compileTemplate,
  parse,
} from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const filename = "app/pages/most-annoying.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });

// Run the actual page handlers with controlled browser events, timers and audio.
function pageHarness() {
  const mounts: (() => void)[] = [];
  const unmounts: (() => void)[] = [];
  const intervals = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  const document = {
    hidden: false,
    activeElement: null as unknown,
    addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const media = {
    matches: false,
    addEventListener: (name: string, fn: () => void) =>
      listeners.set(`media:${name}`, fn),
    removeEventListener: (name: string) => listeners.delete(`media:${name}`),
  };
  const audio = { created: 0, played: 0, disposed: 0 };
  let intervalId = 0;
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    computed: vue.computed,
    definePageMeta() {},
    useSeoMeta() {},
    onMounted: (fn: () => void) => mounts.push(fn),
    onBeforeUnmount: (fn: () => void) => unmounts.push(fn),
    document,
    window: {
      matchMedia: () => media,
      addEventListener: (name: string, fn: () => void) =>
        listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    setInterval(fn: () => void) {
      const id = ++intervalId;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: (id: number) => intervals.delete(id),
  };
  const module = { exports: {} as any };
  const script = compileScript(descriptor, { id: "annoying-test" });
  const source = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", ...Object.keys(globals), source)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "~/lib/cockroach-sound")
        return {
          createSwatSoundPlayer() {
            audio.created++;
            return {
              play() {
                audio.played++;
              },
              dispose() {
                audio.disposed++;
              },
            };
          },
        };
      throw new Error(`Unexpected import: ${name}`);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  const state = module.exports.default.setup({}, { expose() {} });
  mounts.forEach((fn) => fn());
  return {
    state,
    intervals,
    listeners,
    document,
    media,
    audio,
    tick() {
      [...intervals.values()].forEach((fn) => fn());
    },
    dispose() {
      unmounts.forEach((fn) => fn());
    },
  };
}

test("chaos starts on request and keeps exactly one bounded notification timer", () => {
  const page = pageHarness();
  const { state } = page;
  try {
    assert.equal(state.active.value, false);
    assert.equal(page.intervals.size, 0);
    assert.equal(page.audio.created, 0);
    state.startChaos();
    assert.equal(state.notices.value.length, 1);
    assert.equal(page.intervals.size, 1);
    for (let index = 0; index < 100; index++) page.tick();
    assert.equal(state.notices.value.length, 6);
    assert.ok(state.progress.value >= 97 && state.progress.value <= 99);
    state.startChaos();
    assert.equal(page.intervals.size, 1);
    assert.equal(state.notices.value.length, 6);
    assert.equal(page.audio.created, 0);
  } finally {
    page.dispose();
  }
});

test("closing a notification multiplies it, while pause lets users dismiss them normally", () => {
  const page = pageHarness();
  const { state } = page;
  try {
    state.startChaos();
    const firstId = state.notices.value[0].id;
    state.closeNotice(firstId);
    assert.equal(state.notices.value.length, 2);
    state.closeNotice(firstId);
    assert.equal(state.notices.value.length, 2);
    state.togglePause();
    assert.equal(page.intervals.size, 0);
    state.closeNotice(state.notices.value[0].id);
    assert.equal(state.notices.value.length, 1);
    state.togglePause();
    assert.equal(page.intervals.size, 1);
    state.catchButton();
    assert.equal(state.progress.value, 1);
  } finally {
    page.dispose();
  }
});

test("sound, background tabs and navigation stop work without stale callbacks", () => {
  const page = pageHarness();
  const { state } = page;
  state.startChaos();
  state.toggleSound();
  assert.equal(page.audio.created, 1);
  assert.equal(page.audio.played, 1);
  const staleTick = [...page.intervals.values()][0]!;
  page.document.hidden = true;
  page.listeners.get("visibilitychange")!();
  assert.equal(page.intervals.size, 0);
  assert.equal(state.soundEnabled.value, false);
  assert.equal(page.audio.disposed, 1);
  const before = state.progress.value;
  staleTick();
  assert.equal(state.progress.value, before);
  page.document.hidden = false;
  page.listeners.get("visibilitychange")!();
  assert.equal(page.intervals.size, 1);
  state.toggleSound();
  page.dispose();
  assert.equal(page.audio.disposed, 2);
  assert.equal(page.intervals.size, 0);
  assert.equal(page.listeners.size, 0);
  staleTick();
  assert.equal(state.progress.value, before);
  state.startChaos();
  assert.equal(page.intervals.size, 0);
});

test("runaway button remains in bounds and stable for touch, keyboard and reduced motion", () => {
  const page = pageHarness();
  const { state } = page;
  try {
    state.playground.value = { clientWidth: 320, clientHeight: 240 };
    state.runaway.value = { offsetWidth: 160, offsetHeight: 48 };
    state.startChaos();
    for (let index = 0; index < 100; index++) {
      state.dodge({ pointerType: "mouse" });
      assert.ok(
        state.buttonPosition.value.x >= 12 &&
          state.buttonPosition.value.x <= 148,
      );
      assert.ok(
        state.buttonPosition.value.y >= 12 &&
          state.buttonPosition.value.y <= 180,
      );
    }
    const position = state.buttonPosition.value;
    state.dodge({ pointerType: "touch" });
    assert.equal(state.buttonPosition.value, position);
    page.document.activeElement = state.runaway.value;
    state.dodge({ pointerType: "mouse" });
    assert.equal(state.buttonPosition.value, position);
    page.document.activeElement = null;
    page.media.matches = true;
    page.listeners.get("media:change")!();
    state.dodge({ pointerType: "mouse" });
    assert.equal(state.buttonPosition.value, null);
    page.media.matches = false;
    page.listeners.get("media:change")!();
    state.dodge({ pointerType: "mouse" });
    page.listeners.get("resize")!();
    assert.equal(state.buttonPosition.value, null);
  } finally {
    page.dispose();
  }
});

test("the page compiles client and SSR templates and scoped styles", () => {
  const script = compileScript(descriptor, { id: "annoying-test" });
  for (const ssr of [false, true]) {
    const template = compileTemplate({
      source: descriptor.template!.content,
      filename,
      id: "annoying-test",
      ssr,
      ssrCssVars: [],
      compilerOptions: { bindingMetadata: script.bindings },
    });
    assert.deepEqual(template.errors, []);
  }
  assert.deepEqual(
    compileStyle({
      source: descriptor.styles[0]!.content,
      filename,
      id: "annoying-test",
      scoped: true,
    }).errors,
    [],
  );
});
