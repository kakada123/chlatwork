import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const harnessKey = "chlatwork.birthday-celebration-test";
const confettiModule = `const confetti = {
  create(canvas, options) {
    const harness = globalThis[Symbol.for(${JSON.stringify(harnessKey)})];
    harness.creates.push({ canvas, options });
    if (harness.fail) throw new Error('No canvas');
    const fire = options => {
      harness.bursts.push(options);
      return new Promise(resolve => harness.pending.push(resolve));
    };
    fire.reset = () => harness.resets++;
    return fire;
  },
  reset() { throw new Error('Must not reset the global confetti instance'); }
}; export default confetti;`;
const filename = "app/components/moments/BirthdayCelebration.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "birthday-celebration-test", inlineTemplate: true });
const source = ts.transpileModule(compiled.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
  .replace(/from ["']~\/composables\/useAppI18n["']/g, `from ${JSON.stringify(appI18nStubUrl)}`)
  .replace(/from ["']vue["']/g, `from ${JSON.stringify(import.meta.resolve("vue"))}`)
  .replace(/from ["']canvas-confetti["']/g, `from ${JSON.stringify(`data:text/javascript;base64,${Buffer.from(confettiModule).toString("base64")}`)}`);
const Celebration = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

class HostNode {
  tag: string;
  children: HostNode[] = [];
  parent: HostNode | null = null;
  props: Record<string, any> = {};
  text = "";
  constructor(tag: string) { this.tag = tag; }
  get textContent(): string { return this.text + this.children.map((node) => node.textContent).join(""); }
}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => new HostNode(tag),
  createText: (text) => Object.assign(new HostNode("text"), { text }),
  createComment: () => new HostNode("comment"),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
  },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
  setText(node, text) { node.text = text; },
  setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _previous, value) { node.props[key] = value; },
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

function mountCelebration(options: { preview?: boolean; reduced?: boolean; hidden?: boolean; fail?: boolean } = {}) {
  const previous = ["window", "document"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  const motion = Object.assign(new EventTarget(), { matches: options.reduced ?? false });
  const documentRoot = Object.assign(new EventTarget(), { hidden: options.hidden ?? false });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { matchMedia: () => motion } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: documentRoot });
  const harness = {
    creates: [] as any[], bursts: [] as any[], pending: [] as Array<() => void>, resets: 0, fail: options.fail ?? false,
  };
  (globalThis as any)[Symbol.for(harnessKey)] = harness;
  const root = new HostNode("root");
  const app = renderer.createApp(Celebration, { preview: options.preview ?? false });
  app.mount(root);
  const walk = (node: HostNode): HostNode[] => [node, ...node.children.flatMap(walk)];
  const nodes = () => walk(root);
  const button = () => nodes().find((node) => node.tag === "button")!;
  return {
    harness, nodes, button, motion, documentRoot,
    async finish() { harness.pending.splice(0).forEach((resolve) => resolve()); await nextTick(); await nextTick(); },
    unmount() {
      app.unmount();
      for (const [name, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    },
  };
}

test("receiver celebrates once with a bounded owned canvas, and ignores repeated taps until completion", async () => {
  const view = mountCelebration();
  try {
    await nextTick();
    assert.equal(view.harness.creates.length, 1);
    assert.equal(view.harness.creates[0].canvas.tag, "canvas");
    assert.equal(view.harness.bursts.length, 2);
    assert.ok(view.harness.bursts.reduce((total, burst) => total + burst.particleCount, 0) <= 120);
    assert.ok(view.harness.bursts.every((burst) => burst.ticks <= 180 && burst.disableForReducedMotion));
    assert.equal(view.button().props.disabled, true);
    await view.button().props.onClick();
    assert.equal(view.harness.bursts.length, 2);
    await view.finish();
    assert.equal(view.button().props.disabled, false);
    const replay = view.button().props.onClick();
    assert.equal(view.harness.creates.length, 1);
    assert.equal(view.harness.bursts.length, 4);
    await view.finish();
    await replay;
  } finally { view.unmount(); }
});

test("creator preview waits for explicit celebration", async () => {
  const view = mountCelebration({ preview: true });
  try {
    assert.equal(view.harness.creates.length, 0);
    const play = view.button().props.onClick();
    assert.equal(view.harness.bursts.length, 2);
    await view.finish();
    await play;
  } finally { view.unmount(); }
});

test("reduced motion keeps decorations and the greeting without creating animated confetti", async () => {
  const view = mountCelebration({ reduced: true });
  try {
    await nextTick();
    await view.button().props.onClick();
    assert.equal(view.harness.creates.length, 0);
    assert.ok(view.nodes().some((node) => node.props.class?.includes("is-still")));
    assert.ok(view.nodes().some((node) => node.props.role === "status" && node.textContent.includes("Happy birthday")));
  } finally { view.unmount(); }
});

test("hidden pages suppress celebration, cancel active bursts, and never replay on returning", async () => {
  const view = mountCelebration({ hidden: true });
  try {
    assert.equal(view.harness.creates.length, 0);
    view.documentRoot.hidden = false;
    view.documentRoot.dispatchEvent(new Event("visibilitychange"));
    await nextTick();
    assert.equal(view.harness.bursts.length, 0);
    const play = view.button().props.onClick();
    view.documentRoot.hidden = true;
    view.documentRoot.dispatchEvent(new Event("visibilitychange"));
    await nextTick();
    assert.equal(view.harness.resets, 1);
    assert.equal(view.button().props.disabled, true);
    await view.finish();
    await play;
    view.documentRoot.hidden = false;
    view.documentRoot.dispatchEvent(new Event("visibilitychange"));
    await nextTick();
    assert.equal(view.harness.bursts.length, 2);
  } finally { view.unmount(); }
});

test("motion preference changes cancel the instance and unmount removes listeners", async () => {
  const view = mountCelebration();
  view.motion.matches = true;
  view.motion.dispatchEvent(new Event("change"));
  await nextTick();
  assert.equal(view.harness.resets, 1);
  await view.finish();
  view.unmount();
  const resets = view.harness.resets;
  view.motion.dispatchEvent(new Event("change"));
  view.documentRoot.dispatchEvent(new Event("visibilitychange"));
  assert.equal(view.harness.resets, resets);
});

test("unavailable canvas remains a harmless greeting and localized SSR renders without browser APIs", async () => {
  const view = mountCelebration({ fail: true });
  try {
    await nextTick();
    assert.equal(view.button().props.disabled, false);
    assert.ok(view.nodes().some((node) => node.props.role === "status" && node.textContent.includes("Happy birthday")));
  } finally { view.unmount(); }
  const html = await renderToString(createSSRApp(Celebration, { locale: "km" }));
  assert.match(html, /អបអរថ្ងៃកំណើត/);
  assert.match(html, /aria-hidden="true"/);
});
