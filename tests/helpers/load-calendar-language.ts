import { readFileSync } from "node:fs";
import { computed, type Ref } from "vue";
import ts from "../../api/node_modules/typescript/lib/typescript.js";
const source = ts.transpileModule(
  readFileSync("app/composables/useCalendarLanguage.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
export function loadCalendarLanguage(
  locale: Ref<"en" | "km">,
  query: Record<string, unknown>,
) {
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "useRoute", "useRouter", source)(
    (name: string) =>
      name === "vue"
        ? { computed }
        : {
            useLanguage: () => ({
              locale,
              isKhmer: computed(() => locale.value === "km"),
            }),
          },
    module,
    module.exports,
    () => ({ query }),
    () => ({ replace: (to: any) => Object.assign(query, to.query) }),
  );
  return module.exports.useCalendarLanguage();
}
