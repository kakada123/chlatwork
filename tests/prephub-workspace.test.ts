import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as domain from "../app/lib/prephub.ts";

function component(name: string, hub: any = {}) {
  const file = `app/components/prephub/${name}.vue`;
  const { descriptor } = parse(
    readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
    { filename: file },
  );
  const code = ts.transpileModule(
    compileScript(descriptor, { id: name }).content,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const globals = {
    ...vue,
    onMounted() {},
    onBeforeUnmount() {},
    useAppI18n: () => ({ t: (key: string) => key }),
    usePrepHub: () => hub,
    navigateTo: async () => {},
  };
  const mod = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (path: string) =>
      path === "vue" ? vue : path === "~/lib/prephub" ? domain : {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default;
}
function setup(name: string, props: any, hub?: any) {
  return component(name, hub).setup(props, { expose() {}, emit() {} });
}

test("research editor explicitly saves findings, references, conclusion and multiline notes", async () => {
  let saved: any;
  const editor = setup("PrepItemForm", {
    type: "RESEARCH",
    timeZone: "Asia/Phnom_Penh",
    submit: async (body: any) => {
      saved = body;
      return true;
    },
  });
  Object.assign(editor.form, {
    title: "Offline sync",
    findings: "Queue locally\nRetry on reconnect",
    sources: "https://example.com/paper\nInternal report",
    conclusion: "Use idempotent writes",
    content: "**Important**\nDo not lose writes",
    status: "NEEDS_VERIFICATION",
  });
  await editor.save();
  assert.equal(saved.findings, "Queue locally\nRetry on reconnect");
  assert.equal(saved.sources, "https://example.com/paper\nInternal report");
  assert.equal(saved.conclusion, "Use idempotent writes");
  assert.equal(saved.status, "NEEDS_VERIFICATION");
  assert.equal(saved.content, "**Important**\nDo not lose writes");
  assert.equal(saved.dueAt, null);
});

test("subject editor permits no dates and serializes dates in the configured zone", async () => {
  let saved: any;
  const editor = setup("PrepSubjectForm", {
    timeZone: "Asia/Phnom_Penh",
    submit: async (body: any) => {
      saved = body;
      return true;
    },
  });
  editor.form.title = "Research";
  await editor.save();
  assert.equal(saved.eventAt, null);
  assert.equal(saved.deadlineAt, null);
  editor.form.eventAt = "2026-11-17T02:00";
  await editor.save();
  assert.equal(saved.eventAt, "2026-11-16T19:00:00.000Z");
});

test("failed item save preserves the editor and successful save closes it", async () => {
  let success = false;
  const item = { id: "item", title: "Question" };
  const section = setup("PrepSection", {
    section: { id: "section", type: "RESEARCH", items: [item] },
    mutate: async () => success,
  });
  section.editor.value = item;
  await section.saveItem({ title: "Question", findings: "Unsaved finding" });
  assert.equal(section.editor.value.id, "item");
  success = true;
  await section.saveItem({ title: "Question", findings: "Saved finding" });
  assert.equal(section.editor.value, undefined);
});

test("ready review retains materials and only hides completed checklist requirements", () => {
  const items = [
    { id: "done", isCompleted: true },
    { id: "open", isCompleted: false },
  ];
  const checklist = setup("PrepSection", {
    review: true,
    section: { type: "CHECKLIST", items },
  });
  assert.deepEqual(
    checklist.shownItems.value.map((i: any) => i.id),
    ["open"],
  );
  const research = setup("PrepSection", {
    review: true,
    section: { type: "RESEARCH", items },
  });
  assert.equal(research.shownItems.value.length, 2);
});

test("item reordering sends the full sequence and uses the owning section", async () => {
  let call: any[] = [];
  const section = setup("PrepSection", {
    section: {
      id: "section",
      type: "AGENDA",
      items: [{ id: "a" }, { id: "b" }, { id: "c" }],
    },
    mutate: async (...args: any[]) => {
      call = args;
      return true;
    },
  });
  await section.moveItem("b", -1);
  assert.deepEqual(call, [
    "/sections/section/items/reorder",
    "PUT",
    { ids: ["b", "a", "c"] },
  ]);
});

test("inbox dates use the configured account zone", () => {
  const inbox = setup(
    "PrepInbox",
    { timeZone: "America/New_York" },
    {
      owner: vue.ref("owner"),
      error: vue.ref(""),
      date: () => "wrong default zone",
    },
  );
  const instant = "2026-11-17T02:00:00Z";
  assert.equal(
    inbox.date(instant),
    new Intl.DateTimeFormat(undefined, {
      timeZone: "America/New_York",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(instant)),
  );
});

test("a late workspace response cannot overwrite a newer refresh", async () => {
  const waiting: ((s: any) => void)[] = [];
  const workspace = setup(
    "PrepWorkspace",
    { id: "subject" },
    {
      owner: vue.ref("owner"),
      error: vue.ref(""),
      busy: vue.ref(false),
      feedback: vue.ref(""),
      timeZone: vue.ref("Asia/Phnom_Penh"),
      fail() {},
      request: () => new Promise((resolve) => waiting.push(resolve)),
    },
  );
  const first = workspace.load();
  const second = workspace.load();
  waiting[1]({ title: "New", status: "READY", sections: [] });
  await second;
  waiting[0]({ title: "Old", status: "DRAFT", sections: [] });
  await first;
  assert.equal(workspace.subject.value.title, "New");
});
