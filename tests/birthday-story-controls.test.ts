import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { createBirthdayStorySettings } from "../app/lib/birthday-story.ts";

const filename = "app/components/moments/BirthdayStoryEditor.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "birthday-story-editor-test", inlineTemplate: true });
const source = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/from ["']~\/composables\/useAppI18n["']/g, `from ${JSON.stringify(appI18nStubUrl)}`)
  .replace(/from ["']vue["']/g, `from ${JSON.stringify(import.meta.resolve("vue"))}`)
  .replace(/from ["']~\/lib\/birthday-story["']/g, `from ${JSON.stringify(new URL("../app/lib/birthday-story.ts", import.meta.url).href)}`)
  .replace(/from ["']~\/lib\/birthday-story-editor["']/g, `from ${JSON.stringify(new URL("../app/lib/birthday-story-editor.ts", import.meta.url).href)}`);
const Editor = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

test("SSR provides Khmer mode, theme, cake and scene controls", async () => {
  const modelValue = { ...createBirthdayStorySettings(), enabled: true };
  const mode = await renderToString(createSSRApp(Editor, { modelValue, locale: "km", section: "mode" }));
  assert.match(mode, /របៀបសាមញ្ញ/);
  assert.match(mode, /របៀបរឿងរ៉ាវ/);
  const html = await renderToString(createSSRApp(Editor, { modelValue, locale: "km" }));
  assert.match(html, /ផ្កាឈូករ៉ូមែនទិក/);
  assert.match(html, /នំខួបកំណើត/);
  assert.match(html, /max="12"/);
  assert.match(html, /maxlength="160"/);
  assert.equal((html.match(/name="birthday-story-theme"/g) ?? []).length, 4);
});

class Node {
  tag: string; children: Node[] = []; parent: Node | null = null; props: Record<string, any> = {}; text = "";
  constructor(tag: string) { this.tag = tag; }
  get textContent(): string { return this.text + this.children.map(node => node.textContent).join(""); }
}
const renderer = createRenderer<Node, Node>({
  createElement: tag => new Node(tag), createText: text => Object.assign(new Node("text"), { text }), createComment: () => new Node("comment"),
  insert(child, parent, anchor) { child.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(i < 0 ? parent.children.length : i, 0, child); },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); },
  setText(node, text) { node.text = text; }, setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, previous, value) { node.props[key] = value; }, parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

test("rendered controls emit valid settings without mutating the input model", async () => {
  const initial = { ...createBirthdayStorySettings(), enabled: true };
  const model = ref(initial);
  const root = new Node("root");
  const app = renderer.createApp({ setup: () => () => h(Editor, { modelValue: model.value, "onUpdate:modelValue": (value: any) => { model.value = value; } }) });
  app.mount(root);
  const walk = (node: Node): Node[] => [node, ...node.children.flatMap(walk)];
  const input = (id: string) => { const node = walk(root).find(node => node.props.id === id); assert.ok(node, id); return node; };
  try {
    input("story-theme-LUXURY_GOLD").props.onChange();
    await nextTick();
    assert.equal(model.value.theme, "LUXURY_GOLD");
    input("birthday-candles").props.onInput({ target: { value: "99" } });
    await nextTick();
    assert.equal(model.value.cake.candles, 12);
    input("birthday-scene-cake").props.onChange();
    await nextTick();
    assert.equal(model.value.scenes.includes("cake"), false);
    assert.deepEqual(initial, { ...createBirthdayStorySettings(), enabled: true });
    assert.ok(walk(root).some(node => node.tag === "button" && node.props["aria-label"] === "Move Personal message earlier"));
  } finally { app.unmount(); }
});

test("mode switches preserve configured scenes, cake and theme", async () => {
  const model = ref({ ...createBirthdayStorySettings(), enabled: true, theme: "LUXURY_GOLD" as const, cake: { design: "CHOCOLATE" as const, candles: 8 } });
  const root = new Node("root");
  const app = renderer.createApp({ setup: () => () => h(Editor, { section: "mode", modelValue: model.value, "onUpdate:modelValue": (value: any) => { model.value = value; } }) });
  app.mount(root);
  const walk = (node: Node): Node[] => [node, ...node.children.flatMap(walk)];
  try {
    const modes = () => walk(root).filter(node => node.tag === "input" && node.props.name === "birthday-mode");
    modes()[0]!.props.onChange();
    await nextTick();
    assert.equal(model.value.enabled, false);
    assert.equal(model.value.theme, "LUXURY_GOLD");
    assert.deepEqual(model.value.cake, { design: "CHOCOLATE", candles: 8 });
    modes()[1]!.props.onChange();
    await nextTick();
    assert.equal(model.value.enabled, true);
    assert.deepEqual(model.value.scenes, createBirthdayStorySettings().scenes);
  } finally { app.unmount(); }
});
