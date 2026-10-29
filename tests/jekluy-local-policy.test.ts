import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { computed, readonly, ref } from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { canShowAdsForUser } from "../app/lib/ad-visibility.ts";

test("JekLuy's local-only shell skips the ad session fetch while other pages retain it", () => {
  const source = readFileSync(new URL("../app/composables/useAdVisibility.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const localOnly of [true, false]) {
    let requests = 0;
    const mounted: (() => void)[] = [];
    const globals = {
      useRoute: () => ({ meta: { localOnly, blankCanvas: localOnly } }),
      useProductDomain: () => ({ sourcePath: ref(localOnly ? "/jekluy" : "/tools/qr") }),
      useAuth: () => ({ user: ref(null), isReady: ref(false), fetchMe: async () => { requests++; } }),
      computed, readonly,
      onMounted: (fn: () => void) => mounted.push(fn),
    };
    const module = { exports: {} as any };
    new Function("require", "module", "exports", ...Object.keys(globals), code)(
      (name: string) => name === "~/lib/ad-visibility"
        ? { canShowAdsForUser }
        : { useFeatureAvailability: () => ({ loaded: ref(true), isEnabled: () => true, refresh: async () => {} }) },
      module, module.exports, ...Object.values(globals),
    );
    const view = module.exports.useAdVisibility();
    mounted.forEach((fn) => fn());
    assert.equal(requests, localOnly ? 0 : 1);
    assert.equal(view.canShowAds.value, false);
  }
});
