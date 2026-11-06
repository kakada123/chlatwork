import { createI18nStub } from "./i18n-stubs.ts";
import { translateMessage } from "../../app/lib/i18n.ts";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import { useHead, useSeoMeta } from "@unhead/vue";
import ts from "../../api/node_modules/typescript/lib/typescript.js";
import * as calendar from "../../app/lib/khmer-calendar.ts";
import * as sharing from "../../app/lib/calendar-sharing.ts";
import * as holidays from "../../app/data/cambodia-holidays.ts";
import * as celebrations from "../../app/data/calendar-celebrations.ts";

export function loadCalendarComponent(
  filename: string,
  options: {
    route?: any;
    inlineTemplate?: boolean;
    navigateTo?: (path: string) => unknown;
  } = {},
) {
  const file = new URL(`../../${filename}`, import.meta.url).pathname;
  const { descriptor, errors } = parse(readFileSync(file, "utf8"), {
    filename: file,
  });
  if (errors.length) throw errors[0];
  const compiled = compileScript(descriptor, {
    id: "calendar-component-test",
    inlineTemplate: options.inlineTemplate !== false,
  });
  const code = ts.transpileModule(compiled.content, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const dependencies: Record<string, unknown> = {
    vue,
    "~/composables/useAppI18n": { useAppI18n: createI18nStub },
    "~/lib/i18n": { translateMessage },
    "lucide-vue-next": icons,
    "~/lib/khmer-calendar": calendar,
    "~/lib/calendar-sharing": sharing,
    "~/data/cambodia-holidays": holidays,
    "~/data/calendar-celebrations": celebrations,
  };
  const globals = {
    ...vue,
    definePageMeta() {},
    useHead: options.inlineTemplate === false ? () => {} : useHead,
    useSeoMeta: options.inlineTemplate === false ? () => {} : useSeoMeta,
    useRoute: () => options.route ?? { params: {}, query: {} },
    useProductDomain: () => ({
      config: { mainOrigin: "https://chlatwork.com" },
    }),
    useState: () => vue.ref({ year: 2026, month: 11, day: 4 }),
    createError: (data: object) => Object.assign(new Error("Not found"), data),
    navigateTo: options.navigateTo ?? (() => {}),
    onMounted() {},
    onBeforeUnmount() {},
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => {
      if (name.startsWith("~/") && name.endsWith(".vue"))
        return {
          __esModule: true,
          default: loadCalendarComponent(name.replace("~/", "app/"), options),
        };
      if (!(name in dependencies))
        throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports.default;
}
