import { readFileSync } from "node:fs";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../../api/node_modules/typescript/lib/typescript.js";

const filename = "app/components/ModernSelect.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "modern-select-test", inlineTemplate: true });
const source = ts.transpileModule(compiled.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
  .replace(/from ["'](vue|lucide-vue-next)["']/g, (_match, name) => `from ${JSON.stringify(import.meta.resolve(name))}`)
  .replace(/from ["']~\/lib\/([^"']+)["']/g, (_match, name) => `from ${JSON.stringify(new URL(`../../app/lib/${name}.ts`, import.meta.url).href)}`);
export const ModernSelect = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;
