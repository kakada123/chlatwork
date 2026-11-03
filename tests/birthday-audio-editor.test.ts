import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { compileScript, parse } from "@vue/compiler-sfc";
import { createRenderer, createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { BIRTHDAY_AUDIO_TRACKS } from "../api/src/moments/birthday-audio.ts";
const catalog = BIRTHDAY_AUDIO_TRACKS.map(({ id, title, durationMs }) => ({ id, title, durationMs, src: `/api/moments/birthday-audio/${id}` }));

type PlayerState = "loading" | "playing" | "paused" | "error";
type PlayerHarness = {
  plays: Array<{ src: string; clip: { startMs: number; endMs: number } }>;
  pauses: number;
  destroys: number;
  fail: boolean;
  pending: boolean;
  resolve?: () => void;
};
const harnessKey = "chlatwork.birthday-audio-editor-test";
const playerModule = `export function createBirthdayAudioPlayer(audio, options) {
  const harness = globalThis[Symbol.for(${JSON.stringify(harnessKey)})];
  return {
    async play(src, clip) {
      harness.plays.push({ src, clip });
      options.onState('loading');
      if (harness.pending) await new Promise(resolve => { harness.resolve = resolve; });
      options.onState(harness.fail ? 'error' : 'playing');
    },
    pause() { harness.pauses++; options.onState('paused'); },
    destroy() { harness.destroys++; }
  };
}`;
const catalogModule = `import { ref } from ${JSON.stringify(import.meta.resolve("vue"))};
export function useBirthdayAudioCatalog() {
  return globalThis[Symbol.for(${JSON.stringify(harnessKey)})]?.catalog ?? {
    tracks: ref(${JSON.stringify(catalog)}), loading: ref(false), error: ref(null), refresh: async () => {}
  };
}`;
const filename = "app/components/moments/BirthdayAudioEditor.vue";
const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
const compiled = compileScript(descriptor, { id: "birthday-audio-editor-test", inlineTemplate: true });
const source = ts.transpileModule(compiled.content, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
  .replace(/from ["']vue["']/g, `from ${JSON.stringify(import.meta.resolve("vue"))}`)
  .replace(/from ["']~\/lib\/birthday-audio["']/g, `from ${JSON.stringify(new URL("../app/lib/birthday-audio.ts", import.meta.url).href)}`)
  .replace(/from ["']~\/composables\/useBirthdayAudioCatalog["']/g, `from ${JSON.stringify(`data:text/javascript;base64,${Buffer.from(catalogModule).toString("base64")}`)}`)
  .replace(/from ["']~\/lib\/birthday-audio-player["']/g, `from ${JSON.stringify(`data:text/javascript;base64,${Buffer.from(playerModule).toString("base64")}`)}`);
const Editor = (await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)).default;

class HostNode extends EventTarget {
  tag: string;
  children: HostNode[] = [];
  parent: HostNode | null = null;
  props: Record<string, any> = {};
  text = "";
  value = "";
  constructor(tag: string) { super(); this.tag = tag; }
  get textContent(): string { return this.text + this.children.map((node) => node.textContent).join(""); }
}
const renderer = createRenderer<HostNode, HostNode>({
  createElement: (tag) => new HostNode(tag),
  createText: (text) => Object.assign(new HostNode("text"), { text }),
  createComment: () => new HostNode("comment"),
  insert(child, parent, anchor) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child);
  },
  remove(child) { if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1); child.parent = null; },
  setText(node, text) { node.text = text; },
  setElementText(node, text) { node.text = text; node.children = []; },
  patchProp(node, key, _previous, value) { node.props[key] = value; if (key === "value") node.value = value; },
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

function mountEditor(options: { pending?: boolean; failed?: boolean } = {}) {
  const harness: PlayerHarness = { plays: [], pauses: 0, destroys: 0, fail: false, pending: false };
  const catalogState = { tracks: ref(options.pending || options.failed ? [] : catalog), loading: ref(Boolean(options.pending)), error: ref<unknown>(options.failed ? new Error("unavailable") : null), refresh: async () => {} };
  Object.assign(harness, { catalog: catalogState });
  (globalThis as any)[Symbol.for(harnessKey)] = harness;
  const model = ref<any>(null);
  const emitted: any[] = [];
  const root = new HostNode("root");
  const app = renderer.createApp({
    setup: () => () => h(Editor, {
      modelValue: model.value,
      "onUpdate:modelValue": (value: unknown) => { model.value = value; emitted.push(value); },
    }),
  });
  app.mount(root);
  const walk = (node: HostNode): HostNode[] => [node, ...node.children.flatMap(walk)];
  const nodes = () => walk(root);
  const button = (label: string) => {
    const node = nodes().find((node) => node.tag === "button" && node.textContent === label);
    assert.ok(node, `missing button ${label}`);
    return node;
  };
  return {
    app, harness, model, emitted, nodes, button, catalogState,
    async click(label: string) {
      const node = button(label);
      assert.ok(!node.props.disabled, `${label} is disabled`);
      await node.props.onClick();
      await nextTick();
    },
    async boundary(which: "start" | "end", value: string) {
      const input = nodes().find((node) => node.props.id?.endsWith(`-${which}`))!;
      input.value = value;
      input.props.onInput({ target: input });
      await nextTick();
    },
  };
}

test("SSR renders localized accessible controls without creating an audio player", async () => {
  const html = await renderToString(createSSRApp(Editor, { locale: "km" }));
  assert.match(html, /តន្ត្រីថ្ងៃកំណើត/);
  assert.match(html, /type="search"/);
  assert.match(html, /preload="none"/);
  assert.doesNotMatch(html, /<select/);
});

test("track previews and candidate choices remain independent from the saved music", async () => {
  const view = mountEditor();
  try {
    await view.click("Preview");
    assert.deepEqual(view.emitted, []);
    assert.equal(view.harness.plays[0].src, catalog[0]!.src);
    assert.deepEqual(view.harness.plays[0].clip, { startMs: 0, endMs: BIRTHDAY_AUDIO_TRACKS[0]!.durationMs });
    assert.equal(view.button("Use this clip").props.disabled, true);
    await view.click("Choose");
    assert.deepEqual(view.emitted, []);
    assert.equal(view.button("Use this clip").props.disabled, true);
    assert.equal(view.nodes().filter((node) => node.tag === "audio").length, 1);
  } finally { view.app.unmount(); }
});

test("trim preview enables explicit application of exactly the selected section, and remove clears it", async () => {
  const view = mountEditor();
  try {
    await view.boundary("start", "5.2");
    await view.boundary("end", "10.5");
    await view.click("Preview selected clip");
    assert.deepEqual(view.emitted, []);
    assert.deepEqual(view.harness.plays[0].clip, { trackId: BIRTHDAY_AUDIO_TRACKS[0]!.id, startMs: 5200, endMs: 10500 });
    assert.equal(view.button("Use this clip").props.disabled, false);
    await view.click("Use this clip");
    assert.deepEqual(view.emitted, [{ trackId: BIRTHDAY_AUDIO_TRACKS[0]!.id, startMs: 5200, endMs: 10500 }]);
    await view.click("Remove music");
    assert.equal(view.model.value, null);
    assert.equal(view.emitted.length, 2);
  } finally { view.app.unmount(); }
});

test("trim edits enforce a one-second section and require another successful preview", async () => {
  const view = mountEditor();
  try {
    await view.boundary("end", "5");
    await view.boundary("start", "99999");
    await view.click("Preview selected clip");
    assert.deepEqual(view.harness.plays[0].clip, { trackId: BIRTHDAY_AUDIO_TRACKS[0]!.id, startMs: 4000, endMs: 5000 });
    await view.boundary("end", "-2");
    assert.equal(view.button("Use this clip").props.disabled, true);
    await view.click("Preview selected clip");
    assert.deepEqual(view.harness.plays[1].clip, { trackId: BIRTHDAY_AUDIO_TRACKS[0]!.id, startMs: 4000, endMs: 5000 });
    await view.click("Choose");
    assert.equal(view.button("Use this clip").props.disabled, true);
  } finally { view.app.unmount(); }
});

test("failed playback shows recoverable feedback and cannot approve a clip", async () => {
  const view = mountEditor();
  try {
    view.harness.fail = true;
    await view.click("Preview selected clip");
    assert.ok(view.nodes().some((node) => node.props.role === "alert" && node.textContent.includes("could not play")));
    assert.equal(view.button("Use this clip").props.disabled, true);
    view.harness.fail = false;
    await view.click("Preview selected clip");
    assert.equal(view.button("Use this clip").props.disabled, false);
  } finally { view.app.unmount(); }
});

test("a preview resolving after a trim edit cannot approve the new section", async () => {
  const view = mountEditor();
  try {
    view.harness.pending = true;
    const play = view.button("Preview selected clip").props.onClick();
    await view.boundary("start", "2");
    view.harness.resolve!();
    await play;
    await nextTick();
    assert.equal(view.button("Use this clip").props.disabled, true);
    assert.deepEqual(view.emitted, []);
  } finally { view.app.unmount(); }
});

test("external model changes stop previews and unmount destroys the only player", async () => {
  const view = mountEditor();
  await view.click("Preview selected clip");
  const pauses = view.harness.pauses;
  view.model.value = { trackId: BIRTHDAY_AUDIO_TRACKS[1]!.id, startMs: 1000, endMs: 4000 };
  await nextTick();
  assert.ok(view.harness.pauses > pauses);
  assert.equal(view.button("Use this clip").props.disabled, true);
  const start = view.nodes().find((node) => node.props.id?.endsWith("-start"))!;
  assert.equal(start.value, 1);
  view.app.unmount();
  assert.equal(view.harness.destroys, 1);
});

test("search filters track choices without changing the saved clip", async () => {
  const view = mountEditor();
  try {
    const search = view.nodes().find((node) => node.props.type === "search")!;
    search.value = "no birthday track has this title";
    search.dispatchEvent(new Event("input"));
    await nextTick();
    assert.ok(view.nodes().some((node) => node.props.role === "status" && node.textContent === "No tracks found."));
    assert.deepEqual(view.emitted, []);
  } finally { view.app.unmount(); }
});

test("an asynchronously loaded Railway catalog restores the saved trim after mount", async () => {
  const view = mountEditor({ pending: true });
  try {
    view.model.value = { trackId: catalog[1]!.id, startMs: 1000, endMs: 5000 };
    await nextTick();
    assert.equal(view.harness.plays.length, 0);
    view.catalogState.tracks.value = catalog;
    view.catalogState.loading.value = false;
    await nextTick();
    await view.click("Preview selected clip");
    assert.deepEqual(view.harness.plays[0], { src: catalog[1]!.src, clip: view.model.value });
    assert.equal(view.emitted.length, 0);
  } finally { view.app.unmount(); }
});

test("catalog failures show a retry action and cannot apply an unavailable track", async () => {
  const view = mountEditor({ failed: true });
  try {
    assert.ok(view.nodes().some((node) => node.props.role === "alert" && node.textContent.includes("music library")));
    assert.ok(view.button("Try again"));
    assert.equal(view.harness.plays.length, 0);
    assert.equal(view.emitted.length, 0);
    view.catalogState.tracks.value = catalog;
    view.catalogState.error.value = null;
    await nextTick();
    await view.click("Preview selected clip");
    assert.equal(view.harness.plays.length, 1);
  } finally { view.app.unmount(); }
});
