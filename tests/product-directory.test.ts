import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as products from "../app/lib/product-domains.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";

function directory() {
  const locale = vue.ref<boolean | "en" | "km">("km");
  const source = readFileSync("app/components/landing/ProductDirectory.vue", "utf8");
  const { descriptor } = parse(source);
  const compiled = compileScript(descriptor, { id: "product-directory-test", inlineTemplate: true });
  const code = ts.transpileModule(compiled.content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dependencies: Record<string, unknown> = {
    vue, "lucide-vue-next": icons,
    "~/lib/product-domains": products,
    "~/composables/useAppI18n": { useAppI18n: () => createI18nStub(locale) },
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "computed", "useProductDomain", "useFeatureAvailability", code)(
    (name: string) => { if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`); return dependencies[name]; },
    module, module.exports, vue.computed,
    () => ({ destination: (path: string) => path }),
    () => ({ websiteEnabled: () => true }),
  );
  const render = module.exports.default.setup({}, { expose() {} });
  return { locale, render: () => render({}, []) };
}

function nodes(root: any): any[] {
  if (!root || typeof root !== "object") return [];
  return [root, ...(Array.isArray(root.children) ? root.children.flatMap(nodes) : [])];
}

test("mobile app directory is collapsed by default and toggles with accessible state", () => {
  const component = directory();
  let tree = nodes(component.render());
  let button = tree.find(node => node.type === "button");
  assert.equal(button.props["aria-expanded"], false);
  const panel = () => tree.find(node => node.props?.id === button.props["aria-controls"]);
  assert.match(panel().props.class, /hidden sm:flex/);
  button.props.onClick();
  tree = nodes(component.render());
  button = tree.find(node => node.type === "button");
  assert.equal(button.props["aria-expanded"], true);
  assert.doesNotMatch(panel().props.class, /hidden/);
  button.props.onClick();
  tree = nodes(component.render());
  assert.equal(tree.find(node => node.type === "button").props["aria-expanded"], false);
});

test("directory captions follow the shared language and card destinations remain unchanged", () => {
  const component = directory();
  let tree = nodes(component.render());
  assert.equal(tree.find(node => node.type === "button").props["aria-label"], "បង្ហាញកម្មវិធីទាំងអស់");
  const links = tree.filter(node => node.type === "a");
  assert.deepEqual(links.map(node => node.props.href), Object.values(products.PRODUCTS).map(product => product.entry));
  component.locale.value = "en";
  tree = nodes(component.render());
  assert.equal(tree.find(node => node.type === "button").props["aria-label"], "Show all apps");
  assert.ok(tree.some(node => node.type === "span" && node.children === "ChlatWork Creator"));
});
