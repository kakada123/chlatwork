import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { compileScript, parse } from "@vue/compiler-sfc";
import { useHead, useSeoMeta } from "@unhead/vue";
import { createHead, renderSSRHead } from "@unhead/vue/server";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import {
  canonicalUrl,
  createDomainConfig,
} from "../app/lib/product-domains.ts";

// Render the real layout's metadata alongside the application's defaults: crawlers must see one Food image.
for (const dedicatedDomain of [false, true]) {
  test(`Food sharing overrides the homepage image in server HTML (${dedicatedDomain ? "subdomain" : "legacy path"})`, async () => {
    const config = createDomainConfig(
      dedicatedDomain
        ? { enabledProducts: "food", canonicalProducts: "food" }
        : {},
    );
    const canonical = canonicalUrl("/food?private=value#results", config);
    const origin = dedicatedDomain
      ? "https://food.chlatwork.com"
      : "https://chlatwork.com";
    const head = createHead();
    head.push({
      meta: [
        { property: "og:title", content: "ChlatWork homepage" },
        { property: "og:image", content: "https://chlatwork.com/og-home.png" },
        { name: "twitter:image", content: "https://chlatwork.com/og-home.png" },
      ],
      link: [{ rel: "canonical", href: canonical }],
    });
    const filename = new URL("../app/layouts/food.vue", import.meta.url)
      .pathname;
    const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
    const code = ts.transpileModule(
      compileScript(descriptor, { id: "food-share" }).content,
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      },
    ).outputText;
    const module = { exports: {} as any };
    new Function(
      "require",
      "module",
      "exports",
      "useHead",
      "useSeoMeta",
      "computed",
      code,
    )(
      (name: string) => {
        if (name === "vue") return vue;
        if (name === "~/composables/useColorMode")
          return {
            useColorMode: () => ({
              isDark: vue.ref(false),
              toggleColorMode() {},
            }),
          };
        if (name === "~/composables/useProductDomain")
          return {
            useProductDomain: () => ({ config, canonical: vue.ref(canonical) }),
          };
        if (name === "lucide-vue-next")
          return new Proxy({}, { get: () => ({}) });
        throw new Error(`Unexpected dependency: ${name}`);
      },
      module,
      module.exports,
      useHead,
      useSeoMeta,
      vue.computed,
    );
    const layout = module.exports.default;
    layout.render = () => null;
    const app = vue.createSSRApp(layout);
    app.use(head);
    await renderToString(app);
    const { headTags } = await renderSSRHead(head);
    assert.equal((headTags.match(/property="og:image"/g) || []).length, 1);
    assert.equal((headTags.match(/name="twitter:image"/g) || []).length, 1);
    assert.ok(
      headTags.includes(
        `content="${origin}/images/food/khmer-food-background-v1.jpg"`,
      ),
    );
    assert.match(headTags, /property="og:title" content="ChlatWork Food/);
    assert.match(headTags, /name="twitter:card" content="summary_large_image"/);
    assert.match(headTags, /property="og:image:width" content="1600"/);
    assert.match(headTags, /property="og:image:height" content="900"/);
    assert.ok(headTags.includes(`property="og:url" content="${canonical}"`));
    assert.ok(headTags.includes(`rel="canonical" href="${canonical}"`));
    assert.doesNotMatch(headTags, /og-home\.png|private=value/);
  });
}
