import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as guard from "../app/lib/creator-output-language.ts";
import { containsThaiScript as serverContainsThai } from "../api/src/creator-ai/creator-output-language.ts";

const mark = "\u0E01";
const safe = {
  title: "Content pack",
  sections: [
    { id: "subtitle", label: "Subtitle", content: "សួស្តី iPhone 16 😀" },
  ],
  srt: "1\n00:00:01,000 --> 00:00:02,000\nសួស្តី",
};
const tool = {
  id: "video-content-pack",
  resultKind: "content-pack",
  title: "Content pack",
  description: "",
  inputType: "video",
};
const badResults = [
  { ...safe, title: mark },
  { ...safe, sections: [{ ...safe.sections[0], label: mark }] },
  { ...safe, sections: [{ ...safe.sections[0], content: `សួស្តី${mark}` }] },
  {
    ...safe,
    items: [{ id: "idea", title: "Idea", content: "Hello", description: mark }],
  },
  { ...safe, srt: `${safe.srt}${mark}` },
];

function compileComponent(
  path: string,
  inlineTemplate: boolean,
  globals: Record<string, unknown> = {},
  dependencies: Record<string, unknown> = {},
) {
  const filename = new URL(`../${path}`, import.meta.url).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const script = compileScript(descriptor, {
    id: "output-test",
    inlineTemplate,
  });
  const source = ts.transpileModule(
    script.content.replaceAll("import.meta.client", "true"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const stub = { render: () => vue.h("span") };
  const imports: Record<string, unknown> = {
    vue,
    "~/lib/creator-output-language": guard,
    "~/components/developer-tools/CopyButton.vue": {
      __esModule: true,
      default: {
        props: ["text"],
        render() {
          return vue.h("button", "Copy");
        },
      },
    },
    "lucide-vue-next": new Proxy({}, { get: () => stub }),
    ...dependencies,
  };
  const bindings = {
    ref: vue.ref,
    computed: vue.computed,
    watch: vue.watch,
    ...globals,
  };
  const module = { exports: {} as any };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(bindings),
    source,
  )(
    (name: string) => {
      if (!(name in imports)) throw new Error(`Unexpected import: ${name}`);
      return imports[name];
    },
    module,
    module.exports,
    ...Object.values(bindings),
  );
  return module.exports.default;
}

test("browser and API reject every Thai-block character and JSON-decoded escape with identical rules", () => {
  for (let code = 0x0e00; code <= 0x0e7f; code++) {
    const value = {
      sections: [{ content: `សួស្តី${String.fromCodePoint(code)}Hello` }],
    };
    assert.equal(guard.containsThaiScript(value), true);
    assert.equal(serverContainsThai(value), true);
  }
  assert.equal(
    guard.containsThaiScript(JSON.parse('{"text":"\\u0e01"}')),
    true,
  );
  for (const value of [safe, "សួស្តី $10 123 😀", "Hello", null]) {
    assert.equal(guard.containsThaiScript(value), false);
    assert.equal(serverContainsThai(value), false);
  }
});

test("result UI never renders or exposes copy/download controls for unsupported nested output", async () => {
  const component = compileComponent(
    "app/components/creator/CreatorResult.vue",
    true,
  );
  for (const result of badResults) {
    const html = await renderToString(
      vue.createSSRApp(component, { tool, state: "success", result }),
    );
    assert.equal(guard.containsThaiScript(html), false);
    assert.ok(html.includes(guard.CREATOR_OUTPUT_BLOCKED_MESSAGE));
    assert.doesNotMatch(html, /Copy all|Download \.srt|>Ready</);
  }
  const html = await renderToString(
    vue.createSSRApp(component, { tool, state: "success", result: safe }),
  );
  assert.match(html, /សួស្តី/);
  assert.match(html, /Download \.srt/);
});

test("pasted and typed unsupported edits cannot enter displayed or copied sections", () => {
  const scope = vue.effectScope();
  try {
    const component = compileComponent(
      "app/components/creator/CreatorResult.vue",
      false,
    );
    const state = scope.run(() =>
      component.setup(
        { tool, state: "success", result: safe },
        { expose() {}, emit() {} },
      ),
    );
    const section = state.editableSections.value[0];
    const input = { value: `${section.content}${mark}` };
    state.editSection(section, { target: input });
    assert.equal(input.value, safe.sections[0].content);
    assert.equal(guard.containsThaiScript(state.allText.value), false);
    assert.ok(state.editError.value);
    let prevented = false;
    state.beforeEdit({
      data: mark,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    state.editSection(section, { target: { value: "សួស្តី bro" } });
    assert.match(state.allText.value, /សួស្តី bro/);
    assert.equal(state.editError.value, "");
  } finally {
    scope.stop();
  }
});

test("saved history shows every content-pack section without generation actions", async () => {
  const component = compileComponent(
    "app/components/creator/CreatorResult.vue",
    true,
  );
  const html = await renderToString(
    vue.createSSRApp(component, {
      tool,
      state: "success",
      historyView: true,
      result: {
        ...safe,
        sections: [
          ...safe.sections,
          { id: "caption", label: "Caption", content: "Full saved caption" },
        ],
      },
    }),
  );
  assert.match(html, /សួស្តី iPhone 16/);
  assert.match(html, /Full saved caption/);
  assert.match(html, /Download \.srt/);
  assert.doesNotMatch(html, /Regenerate|New variation|Done editing|>Edit</);
  assert.doesNotMatch(html, /role="tablist"/);
});

test("history details fetch the signed-in account's saved result and discard stale responses", async () => {
  const session = vue.ref<any>({ id: "first-account" });
  const route = vue.reactive({ params: { id: "saved-generation" } });
  const requests: ((value: any) => void)[] = [];
  const scope = vue.effectScope();
  const component = compileComponent(
    "app/pages/creator/history/[id].vue",
    false,
    {
      definePageMeta() {},
      useSeoMeta() {},
      onMounted() {},
      onBeforeUnmount() {},
      shallowRef: vue.shallowRef,
      useRoute: () => route,
      useAuth: () => ({ user: session }),
      useFeatureAvailability: () => ({ creatorEnabled: () => true }),
    },
    {
      "~/services/creator-ai.service": {
        getCreatorHistoryEntry: (id: string) => {
          assert.equal(id, "saved-generation");
          return new Promise((resolve) => requests.push(resolve));
        },
      },
      "~/data/creator-tools": {
        CREATOR_TOOLS: [tool],
        CREATOR_FEATURE_TO_TOOL: { VIDEO_CONTENT_PACK: tool.id },
      },
    },
  );
  const entry = {
    id: "saved-generation",
    feature: "VIDEO_CONTENT_PACK",
    result: safe,
    createdAt: "2026-10-15T00:00:00Z",
  };
  try {
    const page = scope.run(() => component.setup({}, { expose() {} }));
    const first = page.load();
    requests.shift()!(entry);
    await first;
    assert.deepEqual(page.result.value, safe);

    const stale = page.load();
    assert.equal(page.result.value, null);
    session.value = { id: "second-account" };
    await vue.nextTick();
    requests.shift()!(entry);
    await stale;
    assert.equal(page.result.value, null);
    requests.shift()!(null);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.match(page.errorMessage.value, /no longer available/i);

    const blocked = page.load();
    requests.shift()!({ ...entry, result: badResults[0] });
    await blocked;
    assert.equal(page.result.value, null);

    const failed = page.load();
    requests.shift()!(Promise.reject(new Error("Private upstream error")));
    await failed;
    assert.match(page.errorMessage.value, /Could not load/);
    assert.doesNotMatch(page.errorMessage.value, /Private upstream/);
    assert.equal(page.loading.value, false);

    session.value = null;
    await vue.nextTick();
    assert.equal(page.result.value, null);
    assert.equal(requests.length, 0);
  } finally {
    scope.stop();
  }
});

test("the Creator dashboard refreshes recent results when the session finishes loading", async () => {
  const session = vue.ref<any>(null);
  const mounted: (() => void)[] = [];
  let refreshes = 0;
  const scope = vue.effectScope();
  const component = compileComponent(
    "app/pages/creator/index.vue",
    false,
    {
      definePageMeta() {},
      useSeoMeta() {},
      onMounted: (fn: () => void) => mounted.push(fn),
      useAuth: () => ({ user: session }),
      useState: () => vue.ref(null),
      useCreatorHistory: () => ({
        items: vue.ref([]),
        refresh: async () => {
          refreshes++;
        },
      }),
      useFeatureAvailability: () => ({ creatorEnabled: () => true }),
    },
    {
      "~/data/creator-tools": {
        CREATOR_TOOLS: [tool],
        getCreatorToolsByCategory: () => [],
      },
    },
  );
  try {
    scope.run(() => {
      component.setup({}, { expose() {} });
      mounted.forEach((fn) => fn());
    });
    await vue.nextTick();
    refreshes = 0;
    session.value = { id: "restored-account" };
    await vue.nextTick();
    assert.equal(refreshes, 1);
  } finally {
    scope.stop();
  }
});

test("download handler independently blocks unsupported SRT and uses a neutral filename", () => {
  const result = vue.ref<any>(badResults.at(-1));
  const state = vue.ref("success");
  const errorMessage = vue.ref("");
  const clicks: any[] = [];
  let blobs = 0;
  const component = compileComponent(
    "app/pages/creator/[...slug].vue",
    false,
    {
      definePageMeta() {},
      useSeoMeta() {},
      useRoute: () => ({ path: "/creator/video/content-pack", query: {} }),
      useCreatorTool: () => ({
        result,
        state,
        errorMessage,
        videoFile: vue.ref({ name: `${mark}.m4a` }),
      }),
      URL: {
        createObjectURL() {
          blobs++;
          return "blob:test";
        },
        revokeObjectURL() {},
      },
      document: {
        createElement() {
          return {
            href: "",
            download: "",
            click() {
              clicks.push(this);
            },
          };
        },
      },
    },
    { "~/data/creator-tools": { getCreatorToolByRoute: () => tool } },
  );
  const page = component.setup({}, { expose() {} });
  page.downloadSrt();
  assert.equal(blobs, 0);
  assert.equal(clicks.length, 0);
  assert.equal(result.value, null);
  assert.equal(errorMessage.value, guard.CREATOR_OUTPUT_BLOCKED_MESSAGE);
  result.value = safe;
  page.downloadSrt();
  assert.equal(blobs, 1);
  assert.equal(clicks[0].download, "chlatwork-subtitles.srt");
});
