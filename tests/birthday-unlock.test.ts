import { appI18nStubUrl } from "./helpers/product-locale-stubs.ts";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import * as h3 from "h3";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { momentBirthdayAccessHeaders, momentBirthdayCookieName, setMomentBirthdayAccess } from "../server/utils/moment-birthday-access.ts";

const filename = "app/components/moments/BirthdayUnlockGate.vue";
const compiled = compileScript(parse(readFileSync(filename, "utf8"), { filename }).descriptor, { id: filename, inlineTemplate: true });
const code = ts.transpileModule(compiled.content, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
  .replace(/from ["']~\/composables\/useAppI18n["']/g, `from ${JSON.stringify(appI18nStubUrl)}`)
  .replace(/from ["'](vue|lucide-vue-next)["']/g, (_match, name) => `from ${JSON.stringify(import.meta.resolve(name))}`);
const Gate = (await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`)).default;

class Node {
  tag: string; children: Node[] = []; parent: Node | null = null; props: Record<string, any> = {}; text = ""; value = "";
  constructor(tag: string) { this.tag = tag; }
  get textContent(): string { return this.text + this.children.map(node => node.textContent).join(""); }
}
const renderer = createRenderer<Node, Node>({
  createElement: tag => new Node(tag), createText: text => Object.assign(new Node("text"), { text }), createComment: () => new Node("comment"),
  insert(child, parent, anchor) { child.parent = parent; const i = anchor ? parent.children.indexOf(anchor) : -1; parent.children.splice(i < 0 ? parent.children.length : i, 0, child); },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); },
  setText(node, text) { node.text = text; }, setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _previous, value) { node.props[key] = value; if (key === "value") node.value = value; },
  parentNode: node => node.parent, nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});
function mountGate(submitting = false) {
  const emitted: unknown[] = [];
  const root = new Node("root");
  const app = renderer.createApp({ render: () => h(Gate, { recipientName: "សុភា", locale: "en", submitting, onUnlock: (value: unknown) => emitted.push(value) }) });
  app.mount(root);
  const nodes = (node = root): Node[] => [node, ...node.children.flatMap(child => nodes(child))];
  return { app, root, emitted,
    async enter(value: string) { const input = nodes().find(node => node.tag === "input")!; input.value = value; input.props.onInput({ target: input }); await nextTick(); },
    async submit() { nodes().find(node => node.tag === "form")!.props.onSubmit({ preventDefault() {}, stopPropagation() {} }); await nextTick(); },
  };
}

test("birthday entry validates DD/MM, accepts Khmer numerals and never sends a year", async () => {
  const view = mountGate();
  try {
    await view.enter("3104"); await view.submit();
    assert.equal(view.emitted.length, 0);
    assert.match(view.root.textContent, /valid birthday/);
    await view.enter("២៩០២"); await view.submit();
    assert.deepEqual(view.emitted, [{ day: 29, month: 2 }]);
    assert.match(view.root.textContent, /សុភា/);
  } finally { view.app.unmount(); }
});

test("birthday entry stays inert while submitting and renders Khmer names on English pages", async () => {
  const view = mountGate(true);
  try { await view.enter("0706"); await view.submit(); assert.equal(view.emitted.length, 0); } finally { view.app.unmount(); }
  const html = await renderToString(createSSRApp(Gate, { recipientName: "សុភា", locale: "en" }));
  assert.match(html, /Wait, សុភា/);
  assert.equal((html.match(/Made with ChlatWork Moments/g) ?? []).length, 1);
});

test("birthday capabilities use distinct HttpOnly secure root cookies and forward only to the matching moment", async () => {
  const app = h3.createApp();
  app.use(h3.defineEventHandler(event => {
    setMomentBirthdayAccess(event, "birthday-a", "dummy-capability", 7200);
    return { own: momentBirthdayAccessHeaders(event, "birthday-a"), other: momentBirthdayAccessHeaders(event, "birthday-b") };
  }));
  const cookieName = momentBirthdayCookieName("birthday-a");
  const response = await h3.toWebHandler(app)(new Request("https://example.test/m/birthday-a", { headers: { cookie: `${cookieName}=old-capability`, "x-forwarded-proto": "https" } }));
  assert.deepEqual(await response.json(), { own: { "x-moment-birthday-access": "old-capability" }, other: {} });
  const cookie = response.headers.get("set-cookie")!;
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=Lax/i); assert.match(cookie, /Path=\//); assert.match(cookie, /Max-Age=3600/);
  assert.notEqual(cookieName, momentBirthdayCookieName("birthday-b"));
});

test("unlock proxy stores the server token without returning it to browser JavaScript", async () => {
  const module = { exports: {} as any };
  const proxyCode = ts.transpileModule(readFileSync("server/api/moments/[id]/unlock.post.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", "defineEventHandler", proxyCode)((name: string) => {
    if (name === "h3") return h3;
    if (name.endsWith("/utils/auth")) return { readAuthBody: async () => ({ day: 7, month: 6 }), requestAuthApi: async () => ({ token: "dummy-private-token", maxAge: 3600 }) };
    if (name.endsWith("/utils/moment-birthday-access")) return { setMomentBirthdayAccess };
    throw new Error(name);
  }, module, module.exports, (handler: unknown) => handler);
  const app = h3.createApp();
  app.use(h3.defineEventHandler(event => { event.context.params = { id: "birthday-a" }; return module.exports.default(event); }));
  const response = await h3.toWebHandler(app)(new Request("https://example.test/api/moments/birthday-a/unlock", { method: "POST" }));
  assert.deepEqual(await response.json(), { unlocked: true });
  assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
