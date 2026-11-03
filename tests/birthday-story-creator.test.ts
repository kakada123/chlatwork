import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { computed, createRenderer, h, nextTick, ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { MOMENT_COPY } from "../app/data/moment-locales.ts";
import { createBirthdayStorySettings } from "../app/lib/birthday-story.ts";

const moduleUrl = (source: string) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const vue = import.meta.resolve("vue");
const stub = moduleUrl(`import {h} from ${JSON.stringify(vue)};export default {setup:()=>()=>h('div')};`);
const preview = moduleUrl(`import {h} from ${JSON.stringify(vue)};export default {props:['moment'],setup:props=>()=>h('div',{'data-preview':JSON.stringify(props.moment)})};`);
function compile(filename: string): string {
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const source = compileScript(descriptor, { id: filename, inlineTemplate: true }).content;
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/from ["']vue["']/g, `from ${JSON.stringify(vue)}`)
    .replace(/from ["'](~\/(?:lib|data)\/[^"']+)["']/g, (_match, path) => `from ${JSON.stringify(new URL(`../app/${path.slice(2)}.ts`, import.meta.url).href)}`);
}
const storyEditor = moduleUrl(compile("app/components/moments/BirthdayStoryEditor.vue"));
let source = compile("app/components/moments/MomentCreator.vue")
  .replace(/from ["']lucide-vue-next["']/g, `from ${JSON.stringify(import.meta.resolve("lucide-vue-next"))}`)
  .replace(/from ["']~\/components\/moments\/BirthdayStoryEditor.vue["']/g, `from ${JSON.stringify(storyEditor)}`)
  .replace(/from ["']~\/components\/moments\/MomentExperience.vue["']/g, `from ${JSON.stringify(preview)}`)
  .replace(/from ["']~\/components\/moments\/[^"']+.vue["']/g, `from ${JSON.stringify(stub)}`)
  .replace(/import\("qrcode"\)/g, `import(${JSON.stringify(moduleUrl("export const toDataURL = async () => 'data:image/png;base64,dummy';"))})`);
source = `import {ref,reactive,computed,watch,onMounted,onBeforeUnmount,nextTick} from ${JSON.stringify(vue)};${source}`;
const Creator = (await import(moduleUrl(source))).default;

class Node extends EventTarget {
  tag: string; children: Node[] = []; parent: Node | null = null; props: Record<string, any> = {}; text = ""; value = "";
  constructor(tag: string) { super(); this.tag = tag; }
  get textContent(): string { return this.text + this.children.map(node => node.textContent).join(""); }
  getRootNode() { return this; }
}
Object.assign(globalThis, { Document: class {}, ShadowRoot: class {} });
const renderer = createRenderer<Node, Node>({
  createElement: tag => new Node(tag), createText: text => Object.assign(new Node("text"), { text }), createComment: () => new Node("comment"),
  insert(child, parent, anchor) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(i < 0 ? parent.children.length : i, 0, child); },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
  setText(node, text) { node.text = text; }, setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, previous, value) { node.props[key] = value; }, parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

function mountCreator(options: { editId?: string; saved?: unknown; failLoad?: boolean; failSave?: boolean } = {}) {
  const requests: { path: string; options: any }[] = [];
  Object.assign(globalThis, {
    useAuth: () => ({ user: ref({ id: "creator" }), isReady: ref(true), fetchMe: async () => {} }),
    useMomentLanguage: () => ({ locale: ref("en"), copy: computed(() => MOMENT_COPY.en), isKhmer: ref(false), localizeMomentPath: (path: string) => path }),
    useProductDomain: () => ({ destination: (path: string) => `https://example.test${path}`, product: "moment" }),
    $fetch: async (path: string, request: any) => {
      requests.push({ path, options: request });
      if (path.endsWith("/edit") && !request?.method) {
        if (options.failLoad) throw new Error("Not found");
        return options.saved;
      }
      if (request?.method === "PUT" && options.failSave) throw new Error("Save failed");
      return { id: options.editId ?? "draft", slug: options.editId ? "same-link" : "birthday" };
    },
  });
  const root = new Node("root");
  const app = renderer.createApp(Creator, { editId: options.editId });
  app.component("AuthLoginDialog", { render: () => h("div") });
  app.component("NuxtLink", { render: () => h("a") });
  app.mount(root);
  const walk = (node: Node): Node[] => [node, ...node.children.flatMap(walk)];
  const nodes = () => walk(root);
  const byId = (id: string) => { const node = nodes().find(node => node.props.id === id); assert.ok(node, id); return node; };
  return {
    app, requests, nodes, byId,
    async ready() { await new Promise(resolve => setImmediate(resolve)); await nextTick(); },
    async input(id: string, value: string) { byId(id).props["onUpdate:modelValue"](value); await nextTick(); },
    async submit() { const form = nodes().find(node => node.tag === "form"); assert.ok(form); await form.props.onSubmit({ preventDefault() {} }); await nextTick(); },
  };
}

test("birthday Story Mode previews and publishes without photos while Simple Mode keeps its photo gate", async () => {
  const view = mountCreator();
  try {
    await view.input("recipient-name", "Neth");
    await view.submit();
    await view.submit();
    assert.ok(view.byId("step-two-title"));
    assert.ok(view.nodes().some(node => node.props.role === "alert"));
    const back = view.nodes().find(node => node.tag === "button" && node.textContent.includes("Back"));
    assert.ok(back); back.props.onClick(); await nextTick();
    const storyMode = view.nodes().filter(node => node.tag === "input" && node.props.name === "birthday-mode")[1];
    assert.ok(storyMode); storyMode.props.onChange(); await nextTick();
    assert.equal(view.nodes().filter(node => node.tag === "nav")[0]?.children.filter(node => node.tag === "button").length, 8);
    await view.submit();
    await view.submit();
    assert.ok(view.byId("birthday-theme"));
    assert.ok(view.byId("birthday-cake"));
    await view.input("secret-message", "");
    await view.submit();
    const previewNode = view.nodes().find(node => node.props["data-preview"]);
    assert.ok(previewNode);
    const moment = JSON.parse(previewNode.props["data-preview"]);
    const hero = moment.blocks.find((block: any) => block.type === "HERO");
    assert.equal(hero.data.birthdayStory.enabled, true);
    assert.deepEqual(hero.data.birthdayStory.memories, []);
    await view.submit();
    assert.equal(view.requests[0]?.path, "/api/moments");
    assert.equal(view.requests[0]?.options.body.birthdayStory.enabled, true);
    assert.deepEqual(view.requests[0]?.options.body.birthdayStory.memories, []);
    assert.equal(view.requests.some(request => request.path.endsWith("/media")), false);
    assert.ok(view.requests.some(request => request.path.endsWith("/publish")));
  } finally { view.app.unmount(); }
});

const savedBirthday = {
  id: "owned", slug: "same-link", status: "PUBLISHED", recipientName: "Neth", occasion: "BIRTHDAY", title: "Saved birthday", theme: "ROMANTIC", publishAt: "2020-01-02T03:04:00.000Z", expiresAt: null,
  blocks: [
    { type: "HERO", data: { birthdayStory: { ...createBirthdayStorySettings(), enabled: true, theme: "LUXURY_GOLD", memories: [{ caption: "First", date: "2020-01-01" }, { caption: "Second", date: "2021-01-01" }] } } },
    { type: "MESSAGE", data: { message: "Saved message" } },
    { type: "SECRET", data: { message: "Saved secret" } },
  ],
  media: [{ id: "one", position: 0, url: "/api/moments/owned/edit/media/one" }, { id: "two", position: 1, url: "/api/moments/owned/edit/media/two" }],
};

test("owner edit retains private photos and their metadata, changes theme, and saves the existing published link", async () => {
  const view = mountCreator({ editId: "owned", saved: savedBirthday });
  try {
    assert.equal(view.nodes().some(node => node.tag === "form"), false);
    await view.ready();
    assert.equal(view.byId("recipient-name").value, "Neth");
    await view.submit();
    const move = view.nodes().find(node => node.props["aria-label"] === "Move photo 2 earlier");
    assert.ok(move); move.props.onClick(); await nextTick();
    await view.input("memory-caption-two", "Edited second");
    await view.submit();
    assert.equal(view.byId("moment-title").value, "Saved birthday");
    assert.equal(view.byId("unlock-date").props.min, undefined);
    view.byId("story-theme-CUTE_PASTEL").props.onChange(); await nextTick();
    await view.input("moment-title", "New birthday title");
    await view.submit();
    assert.ok(view.nodes().some(node => node.tag === "button" && node.textContent.includes("Save changes")));
    await view.submit();
    const put = view.requests.find(request => request.options?.method === "PUT");
    assert.ok(put);
    const payload = JSON.parse(put.options.body.get("payload"));
    assert.equal(put.path, "/api/moments/owned/edit");
    assert.equal(payload.moment.title, "New birthday title");
    assert.equal(payload.moment.birthdayStory.theme, "CUTE_PASTEL");
    assert.deepEqual(payload.photoOrder, ["two", "one"]);
    assert.deepEqual(payload.moment.birthdayStory.memories, [{ caption: "Edited second", date: "2021-01-01" }, { caption: "First", date: "2020-01-01" }]);
    assert.equal(put.options.body.getAll("files").length, 0);
    assert.equal(view.requests.some(request => request.options?.method === "DELETE" || request.path === "/api/moments" || request.path.endsWith("/publish")), false);
    assert.ok(view.nodes().some(node => node.props.id === "moment-link" && node.props.value.endsWith("/m/same-link")));
  } finally { view.app.unmount(); }
});

test("failed owner loads show a recoverable error without exposing an empty editor", async () => {
  const view = mountCreator({ editId: "owned", failLoad: true });
  try {
    await view.ready();
    assert.equal(view.nodes().some(node => node.tag === "form"), false);
    assert.ok(view.nodes().some(node => node.props.role === "alert" && node.textContent.includes("could not be opened")));
  } finally { view.app.unmount(); }
});

test("an existing Moment is never deleted when its atomic update fails", async () => {
  const view = mountCreator({ editId: "owned", saved: savedBirthday, failSave: true });
  try {
    await view.ready();
    await view.submit(); await view.submit(); await view.submit(); await view.submit();
    assert.ok(view.requests.some(request => request.options?.method === "PUT"));
    assert.equal(view.requests.some(request => request.options?.method === "DELETE"), false);
    assert.ok(view.nodes().some(node => node.props.role === "alert" && node.textContent === "Save failed"));
  } finally { view.app.unmount(); }
});

test("clearing an existing scheduled unlock explicitly saves an immediate birthday", async () => {
  const view = mountCreator({ editId: "owned", saved: { ...savedBirthday, publishAt: "2099-11-03T12:00:00.000Z" } });
  try {
    await view.ready();
    await view.submit(); await view.submit();
    const unlock = view.nodes().find(node => node.props.id === "unlock-date")!;
    assert.ok(unlock);
    unlock.props["onUpdate:modelValue"]("");
    await nextTick();
    await view.submit(); await view.submit();
    const put = view.requests.find(request => request.options?.method === "PUT")!;
    const payload = JSON.parse(put.options.body.get("payload"));
    assert.equal(payload.moment.publishAt, null);
  } finally { view.app.unmount(); }
});
