import { readFileSync } from "node:fs";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../../api/node_modules/typescript/lib/typescript.js";

// Resolve the explicit composable import to one live locale shared by the mounted controls.
const localeModule = `import { ref } from ${JSON.stringify(import.meta.resolve("vue"))};
export const testLocale = ref(false);
export const useLanguage = () => ({ isKhmer: testLocale });
import { createI18nStub } from ${JSON.stringify(new URL("./i18n-stubs.ts", import.meta.url).href)};
export const useAppI18n = (override) => createI18nStub(override ?? testLocale);`;
const localeUrl = `data:text/javascript;base64,${Buffer.from(localeModule).toString("base64")}`;
const filename = "app/components/ModernSelect.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "modern-select-test", inlineTemplate: true });
const source = ts.transpileModule(compiled.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
  .replace(/from ["'](vue|lucide-vue-next)["']/g, (_match, name) => `from ${JSON.stringify(import.meta.resolve(name))}`)
  .replace(/from ["']~\/composables\/(?:useLanguage|useAppI18n)["']/g, `from ${JSON.stringify(localeUrl)}`)
  .replace(/from ["']~\/lib\/([^"']+)["']/g, (_match, name) => `from ${JSON.stringify(new URL(`../../app/lib/${name}.ts`, import.meta.url).href)}`);
const componentModule = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
export const ModernSelect = componentModule.default;
export const modernSelectIsKhmer = (await import(localeUrl)).testLocale;
