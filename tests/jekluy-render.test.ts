import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import * as vue from "vue";
import * as renderer from "vue/server-renderer";
import * as icons from "lucide-vue-next";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as jekluy from "../app/lib/jekluy.ts";
import { useJekLuy } from "../app/composables/useJekLuy.ts";

test("the rendered screenshot case shows 15,000 riel as the payment and retains exact amounts only in its audit", async () => {
  const filename = new URL("../app/pages/jekluy.vue", import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, { id: "jekluy-render", inlineTemplate: true, templateOptions: { ssr: true } });
  const code = ts.transpileModule(script.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} as any };
  const globals = {
    ref: vue.ref, computed: vue.computed, nextTick: vue.nextTick,
    definePageMeta() {}, useSeoMeta() {}, useHead() {},
    useJekLuy: () => {
      const state = useJekLuy();
      state.draft.value.participants = [{ id: "p0", name: "កក្កដា", amount: "3333" }, { id: "p1", name: "ដាណែត", amount: "33333" }];
      return state;
    },
  };
  const dependencies: Record<string, unknown> = {
    vue, "vue/server-renderer": renderer, "lucide-vue-next": icons, "~/lib/jekluy": jekluy,
    "~/components/ui/ConfirmDialog.vue": { __esModule: true, default: { render: () => null } },
  };
  new Function("require", "module", "exports", ...Object.keys(globals), code)((name: string) => {
    if (!dependencies[name]) throw new Error(`Unexpected render dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports, ...Object.values(globals));
  const html = await renderer.renderToString(vue.createSSRApp(module.exports.default));
  const payments = html.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/)![0];
  assert.match(payments, /15,000៛/);
  assert.doesNotMatch(payments, /14,967/);
  assert.match(html, /36,666៛/);
  assert.match(html, /18,300៛/);
  assert.match(html, /មើលការបង្គត់លុយសង/);
  assert.match(html, /14,967៛ → 15,000៛/);
});
