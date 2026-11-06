import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";

const vueUrl = import.meta.resolve("vue");
const moduleCache = new Map<string, string>();
const harnessKey = "chlatwork.birthday-story-receiver";
const stubs: Record<string, string> = {
  "BirthdayMusicPlayer.vue": `import {defineComponent,h} from '${vueUrl}'; export default defineComponent({setup(_, {expose}) { expose({requestPlay: () => globalThis[Symbol.for('${harnessKey}')].music++}); return () => h('div', {'data-music':true}); }});`,
  "BirthdayCelebration.vue": `import {defineComponent,h} from '${vueUrl}'; export default defineComponent({setup(_, {expose}) { expose({celebrate: () => globalThis[Symbol.for('${harnessKey}')].celebrations++}); return () => h('div', {'data-celebration':true}); }});`,
};
function moduleUrl(filename: string): string {
  if (moduleCache.has(filename)) return moduleCache.get(filename)!;
  const raw = readFileSync(filename, "utf8");
  const script = stubs[path.basename(filename)] ?? (filename.endsWith(".vue")
    ? compileScript(parse(raw, { filename }).descriptor, { id: filename, inlineTemplate: true }).content : raw);
  const output = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from (["'])([^"']+)\1/g, (_, _quote, specifier: string) => {
      let target: string;
      if (specifier === "~/composables/useAppI18n") return `from ${JSON.stringify(appI18nStubUrl)}`;
      if (specifier.startsWith("~/") || specifier.startsWith(".")) {
        let resolved = specifier.startsWith("~/") ? path.resolve("app", specifier.slice(2)) : path.resolve(path.dirname(filename), specifier);
        if (!path.extname(resolved)) resolved += ".ts";
        target = moduleUrl(resolved);
      } else target = import.meta.resolve(specifier);
      return `from ${JSON.stringify(target)}`;
    });
  const url = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  moduleCache.set(filename, url);
  return url;
}
const Experience = (await import(moduleUrl(path.resolve("app/components/moments/BirthdayStoryExperience.vue")))).default;

class HostNode {
  tag: string; children: HostNode[] = []; parent: HostNode | null = null; props: Record<string, any> = {}; text = "";
  constructor(tag: string) { this.tag = tag; }
  get textContent(): string { return this.text + this.children.map((node) => node.textContent).join(""); }
  focus() { this.props.focused = true; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 320, height: 200 }; }
  getContext() { return null; }
  setPointerCapture() {}
  releasePointerCapture() {}
}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => new HostNode(tag), createText: (text) => Object.assign(new HostNode("text"), { text }), createComment: () => new HostNode("comment"),
  insert(child, parent, anchor) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(i < 0 ? parent.children.length : i, 0, child); },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
  setText(node, text) { node.text = text; }, setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _old, value) { node.props[key] = value; }, parentNode: (node) => node.parent, nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});
function mount(options: Record<string, any> = {}) {
  const harness = { music: 0, celebrations: 0 };
  (globalThis as any)[Symbol.for(harnessKey)] = harness;
  const settings = { version: 1, enabled: true, theme: "ROMANTIC_PINK", scenes: ["gift", "cake", "memories", "message", "secret", "celebration"], teaser: "A special surprise", cake: { design: "CHOCOLATE", candles: 2 }, memories: [{ caption: "First memory", date: "2026-01-01" }, { caption: "Second memory", date: "" }], allowReplay: true, allowReactions: true, ...options.settings };
  const moment = { status: "ready", slug: "test-birthday", recipientName: "Dara", title: "Happy birthday Dara", occasion: "BIRTHDAY", theme: "ROMANTIC", blocks: [{ id: "hero", type: "HERO", position: 0, data: { birthdayAudio: { trackId: "hbd-001", startMs: 0, endMs: 5000 } } }, { id: "message", type: "MESSAGE", position: 1, data: { message: "រីករាយថ្ងៃកំណើត ដារា ❤️" } }, { id: "secret", type: "SECRET", position: 2, data: { message: "Surprise dinner!" } }], media: [{ id: "second", position: 1, url: "/second.webp" }, { id: "first", position: 0, url: "/first.webp" }], ...options.moment };
  const root = new HostNode("root");
  const app = renderer.createApp(Experience, { moment, settings, preview: true });
  app.mount(root);
  const walk = (node: HostNode): HostNode[] => [node, ...node.children.flatMap(walk)];
  const nodes = () => walk(root);
  const action = (name: string) => nodes().find((node) => node.props["data-action"] === name)!;
  return { root, nodes, action, harness, unmount: () => app.unmount(), async click(name: string) { const button = action(name); assert.ok(button, `Missing action ${name}`); assert.ok(!button.props.disabled, `Disabled action ${name}`); button.props.onClick(); await nextTick(); await nextTick(); } };
}

test("gift and candle interactions gate progress, preserve state on back, and retry music immediately", async () => {
  const view = mount();
  try {
    assert.equal(view.action("next").props.disabled, true);
    await view.click("open-gift");
    assert.equal(view.harness.music, 1);
    await view.click("next");
    assert.equal(view.action("next").props.disabled, true);
    await view.click("candle-0");
    assert.equal(view.action("next").props.disabled, true);
    await view.click("candle-1");
    assert.equal(view.action("next").props.disabled, false);
    assert.equal(view.harness.celebrations, 1);
    await view.click("previous");
    assert.equal(view.action("next").props.disabled, false);
    await view.click("next");
    assert.equal(view.action("next").props.disabled, false);
    assert.equal(view.nodes().filter((node) => node.props["data-music"]).length, 1);
  } finally { view.unmount(); }
});

test("opening the gift advances automatically after its animation and never skips twice", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const view = mount();
  try {
    await view.click("open-gift");
    assert.equal(view.nodes().find(node => node.props["data-scene"])?.props["data-scene"], "gift");
    context.mock.timers.tick(700);
    await nextTick(); await nextTick();
    assert.equal(view.nodes().find(node => node.props["data-scene"])?.props["data-scene"], "cake");
    context.mock.timers.tick(2000);
    await nextTick();
    assert.equal(view.nodes().find(node => node.props["data-scene"])?.props["data-scene"], "cake");
  } finally { view.unmount(); context.mock.timers.reset(); }
});

test("memories use saved order, captions and dates, and tolerate image load errors", async () => {
  const view = mount({ settings: { scenes: ["memories", "message"] } });
  try {
    assert.equal(view.nodes().find((node) => node.tag === "img")?.props.src, "/first.webp");
    assert.match(view.root.textContent, /First memory/);
    assert.match(view.root.textContent, /2026-01-01/);
    view.nodes().find((node) => node.tag === "img")!.props.onError();
    await nextTick();
    assert.match(view.root.textContent, /unavailable/i);
    await view.click("next-photo");
    assert.match(view.root.textContent, /Second memory/);
    assert.equal(view.nodes().find((node) => node.tag === "img")?.props.src, "/second.webp");
  } finally { view.unmount(); }
});

test("letter and accessible scratch reveal render Unicode text and replay clears recipient state", async () => {
  const view = mount({ settings: { scenes: ["gift", "message", "secret", "celebration"] } });
  try {
    await view.click("open-gift"); await view.click("next");
    assert.doesNotMatch(view.root.textContent, /រីករាយថ្ងៃកំណើត ដារា/);
    await view.click("open-letter");
    assert.match(view.root.textContent, /រីករាយថ្ងៃកំណើត ដារា/);
    await view.click("next");
    assert.doesNotMatch(view.root.textContent, /Surprise dinner/);
    await view.click("reveal-secret");
    assert.match(view.root.textContent, /Surprise dinner/);
    await view.click("next");
    await view.click("reaction-heart");
    assert.match(view.root.textContent, /only on this device/i);
    await view.click("replay");
    assert.equal(view.action("next").props.disabled, true);
    await view.click("open-gift"); await view.click("next");
    assert.ok(view.action("open-letter"));
    await view.click("next");
    assert.ok(view.action("reveal-secret"));
    await view.click("next");
    assert.equal(view.action("reaction-heart").props["aria-pressed"], false);
  } finally { view.unmount(); }
});

test("missing optional content falls back to a usable letter with no navigation trap", async () => {
  const view = mount({ settings: { scenes: ["memories", "secret"], allowReplay: false }, moment: { media: [], blocks: [] } });
  try {
    assert.match(view.root.textContent, /message|letter/i);
    assert.ok(view.action("open-letter"));
    assert.equal(view.action("previous").props.disabled, true);
    assert.equal(view.action("next"), undefined);
    assert.equal(view.action("replay"), undefined);
    await view.click("open-letter");
    assert.match(view.root.textContent, /birthday/i);
  } finally { view.unmount(); }
});

test("scratch reveal requires meaningful coverage and cancellation stops pointer progress", async () => {
  const view = mount({ settings: { scenes: ["secret", "celebration"] } });
  try {
    const canvas = view.nodes().find((node) => node.tag === "canvas")!;
    const event = (x: number, y: number, pointerId = 1) => ({ pointerId, clientX: x, clientY: y, pointerType: "touch", button: 0, preventDefault() {} });
    canvas.props.onPointerdown(event(20, 20));
    for (let i = 0; i < 100; i++) canvas.props.onPointermove(event(21, 21));
    await nextTick();
    assert.ok(view.action("reveal-secret"));
    canvas.props.onPointercancel(event(21, 21));
    for (let y = 10; y < 200; y += 20) canvas.props.onPointermove(event(300, y));
    await nextTick();
    assert.ok(view.action("reveal-secret"));
    canvas.props.onPointerdown(event(10, 10, 2));
    for (let row = 0; row < 7; row++) {
      canvas.props.onPointermove(event(row % 2 ? 10 : 310, row * 30 + 10, 2));
      canvas.props.onPointermove(event(row % 2 ? 310 : 10, row * 30 + 10, 2));
    }
    await nextTick();
    assert.equal(view.action("reveal-secret"), undefined);
    assert.match(view.root.textContent, /Surprise dinner/);
  } finally { view.unmount(); }
});

test("sharing happens only on tap and recovers from missing clipboard with a selectable link", async () => {
  const previous = ["window", "navigator"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
  let shared = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { location: { origin: "https://example.test" } } });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { async share() { shared++; throw Object.assign(new Error("Unavailable"), { name: "NotAllowedError" }); } } });
  const view = mount({ settings: { scenes: ["celebration"], allowReactions: false, allowReplay: false } });
  try {
    assert.equal(shared, 0);
    assert.equal(view.action("reaction-heart"), undefined);
    assert.equal(view.action("replay"), undefined);
    await view.click("share");
    assert.equal(shared, 1);
    assert.equal(view.nodes().find((node) => node.tag === "input")?.props.value, "https://example.test/m/test-birthday");
    assert.match(view.root.textContent, /Copy the link/);
  } finally {
    view.unmount();
    for (const [name, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); }
  }
});

test("all four themes render server-side without browser APIs or platform hero copy", async () => {
  for (const theme of ["ROMANTIC_PINK", "LUXURY_GOLD", "CUTE_PASTEL", "MINIMAL_ELEGANT"]) {
    const html = await renderToString(createSSRApp(Experience, {
      moment: { status: "ready", slug: "ssr", recipientName: "Dara", title: "For Dara ❤️", occasion: "BIRTHDAY", theme: "CUTE", blocks: [], media: [] },
      settings: { version: 1, enabled: true, theme, scenes: ["message"], teaser: "", cake: { design: "CLASSIC", candles: 1 }, memories: [], allowReplay: true, allowReactions: true },
    }));
    assert.match(html, new RegExp(`data-theme="${theme}"`));
    assert.match(html, /For Dara ❤️/);
    assert.equal((html.match(/Made with ChlatWork Moments/g) ?? []).length, 1);
    assert.doesNotMatch(html, /Birthday Moment|A little place on the internet for|Your birthday surprise/);
  }
});
