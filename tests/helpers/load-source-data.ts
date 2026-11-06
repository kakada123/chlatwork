import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "../../api/node_modules/typescript/lib/typescript.js";

const root = new URL("../../", import.meta.url).pathname;
const modules = new Map<string, { exports: any }>();
const requirePackage = createRequire(import.meta.url);

/** Evaluate only source data modules; Nuxt aliases are resolved without booting the app or reading configuration. */
export function loadSourceData(path: string): any {
  const filename = resolve(root, path);
  if (!filename.startsWith(`${root}app/`) || !filename.endsWith(".ts")) throw new Error(`Unsupported data module: ${path}`);
  if (modules.has(filename)) return modules.get(filename)!.exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function("require", "module", "exports", code)((name: string) => {
    if (name === "vue-i18n") return requirePackage(name);
    const dependency = name.startsWith("~/") ? resolve(root, "app", name.slice(2)) : name.startsWith(".") ? resolve(filename, "..", name) : "";
    if (!dependency) throw new Error(`Unexpected dependency: ${name}`);
    return loadSourceData(dependency.endsWith(".ts") ? dependency : `${dependency}.ts`);
  }, module, module.exports);
  return module.exports;
}
