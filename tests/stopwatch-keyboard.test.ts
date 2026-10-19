import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { compileScript, parse } from "@vue/compiler-sfc";
import { transformSync } from "esbuild";
import * as vue from "vue";
import * as stopwatch from "../app/lib/stopwatch.ts";

const require = createRequire(import.meta.url);
const filename = "app/pages/tools/stopwatch.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "stopwatch-keyboard" });
const { code } = transformSync(compiled.content, {
  loader: "ts",
  format: "cjs",
  target: "es2022",
});

// Exercise the real page setup with controlled browser events and animation timing.
function openPage() {
  const window = new EventTarget();
  const mounted: Array<() => void> = [];
  const unmounted: Array<() => void> = [];
  let now = 1_000;
  const module: { exports: Record<string, any> } = { exports: {} };
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name: string) =>
      name === "~/lib/stopwatch" ? stopwatch : require(name),
    ...vue,
    window,
    useSeoMeta: () => {},
    onMounted: (fn: () => void) => mounted.push(fn),
    onBeforeUnmount: (fn: () => void) => unmounted.push(fn),
    performance: { now: () => now },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
  });
  const page = module.exports.default.setup({}, { expose: () => {} });
  for (const mount of mounted) mount();
  return {
    page,
    window,
    setTime: (value: number) => {
      now = value;
    },
    close: () => {
      for (const unmount of unmounted) unmount();
    },
  };
}

function pressSpace(
  window: EventTarget,
  options: Record<string, unknown> = {},
) {
  const event = new Event("keydown", { cancelable: true });
  const { target, ...properties } = options;
  Object.assign(event, {
    key: " ",
    code: "Space",
    repeat: false,
    ...properties,
  });
  if (target) Object.defineProperty(event, "target", { value: target });
  window.dispatchEvent(event);
  return event;
}

test("Space starts on first page load, prevents scrolling, and pauses and resumes", () => {
  const { page, window, setTime, close } = openPage();
  try {
    assert.equal(pressSpace(window).defaultPrevented, true);
    assert.equal(page.running.value, true);
    setTime(2_500);
    assert.equal(pressSpace(window).defaultPrevented, true);
    assert.equal(page.running.value, false);
    assert.equal(page.elapsedMs.value, 1_500);
    setTime(5_000);
    pressSpace(window);
    assert.equal(page.running.value, true);
    assert.equal(page.stopwatch.startedAt, 5_000);
  } finally {
    close();
  }
});

test("holding Space does not repeatedly toggle and still prevents scrolling", () => {
  const { page, window, close } = openPage();
  try {
    pressSpace(window);
    assert.equal(pressSpace(window, { repeat: true }).defaultPrevented, true);
    assert.equal(page.running.value, true);
  } finally {
    close();
  }
});

test("modified Space and other keys retain their browser behavior", () => {
  const { page, window, close } = openPage();
  try {
    for (const modifier of ["ctrlKey", "metaKey", "altKey", "shiftKey"]) {
      assert.equal(
        pressSpace(window, { [modifier]: true }).defaultPrevented,
        false,
      );
    }
    assert.equal(
      pressSpace(window, { code: "Enter", key: "Enter" }).defaultPrevented,
      false,
    );
    assert.equal(page.running.value, false);
  } finally {
    close();
  }
});

test("leaving the page removes the shortcut", () => {
  const { page, window, close } = openPage();
  close();
  assert.equal(pressSpace(window).defaultPrevented, false);
  assert.equal(page.running.value, false);
});

test("focused controls and editable text retain their native Space behavior", () => {
  const { page, window, close } = openPage();
  try {
    for (const target of [
      { isContentEditable: true },
      { closest: () => ({ tagName: "BUTTON" }) },
      { closest: () => ({ tagName: "INPUT" }) },
    ]) {
      assert.equal(pressSpace(window, { target }).defaultPrevented, false);
      assert.equal(page.running.value, false);
    }
  } finally {
    close();
  }
});

test("a shortcut already handled elsewhere is not handled again", () => {
  const { page, window, close } = openPage();
  try {
    const event = new Event("keydown", { cancelable: true });
    Object.assign(event, { key: " ", code: "Space" });
    event.preventDefault();
    window.dispatchEvent(event);
    assert.equal(page.running.value, false);
  } finally {
    close();
  }
});
