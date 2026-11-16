import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import { renderToString } from "vue/server-renderer";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as icons from "lucide-vue-next";
import * as prep from "../app/lib/prephub.ts";
import { createI18nStub } from "./helpers/i18n-stubs.ts";
function load(name: string, hub: any = {}, inline = false) {
  const file = `app/components/prephub/${name}.vue`,
    { descriptor } = parse(readFileSync(file, "utf8"), { filename: file });
  const code = ts.transpileModule(
    compileScript(descriptor, { id: "notebook-test", inlineTemplate: inline })
      .content,
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
    useAppI18n: createI18nStub,
    usePrepHub: () => hub,
    useProductDomain: () => ({ linkTo: (p: string) => p }),
    navigateTo: async () => {},
  };
  const mod = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (path: string) =>
      path === "vue"
        ? vue
        : path === "lucide-vue-next"
          ? icons
          : path === "~/lib/prephub"
            ? prep
            : path.endsWith("PrepFormattedText.vue")
              ? {
                  __esModule: true,
                  default: load("PrepFormattedText", hub, true),
                }
              : path.endsWith(".vue")
                ? {
                    __esModule: true,
                    default: { setup: () => () => vue.h("span") },
                  }
                : {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default;
}
const section = (id: string, type: any, items: any[] = []) => ({
  id,
  type,
  title: id,
  items,
  resources: [],
});
test("notebook grouping preserves every saved section and the relative order within each area", () => {
  const sections = [
    section("source", "LINKS"),
    section("question", "QUESTIONS"),
    section("check", "CHECKLIST"),
    section("research", "RESEARCH"),
    section("output", "DELIVERABLES"),
    section("notes", "NOTES"),
    section("agenda", "AGENDA"),
    section("files", "ATTACHMENTS"),
  ];
  assert.equal(typeof (prep as any).notebookGroups, "function");
  const groups = (prep as any).notebookGroups(sections);
  assert.deepEqual(
    groups.checklist.map((s: any) => s.id),
    ["check", "output"],
  );
  assert.deepEqual(
    groups.materials.map((s: any) => s.id),
    ["source", "notes", "agenda", "files"],
  );
  assert.deepEqual(
    groups.questions.map((s: any) => s.id),
    ["question", "research"],
  );
  assert.equal(groups.materials[0], sections[0]);
  assert.deepEqual(
    sections.map((s) => s.id),
    [
      "source",
      "question",
      "check",
      "research",
      "output",
      "notes",
      "agenda",
      "files",
    ],
  );
});
test("subject creation is blank by default and preserves optional advanced values when saved", async () => {
  let saved: any;
  const form = load("PrepSubjectForm").setup(
    {
      timeZone: "Asia/Phnom_Penh",
      submit: async (v: any) => {
        saved = v;
        return true;
      },
    },
    { expose() {}, emit() {} },
  );
  form.form.title = "Research POS";
  await form.save();
  assert.equal(saved.template, "NONE");
  assert.equal(saved.eventAt, null);
  assert.equal(saved.deadlineAt, null);
  Object.assign(form.form, {
    goal: "Compare reliable architectures",
    category: "RESEARCH",
    priority: "HIGH",
    template: "RESEARCH",
  });
  await form.save();
  assert.equal(saved.goal, "Compare reliable architectures");
  assert.equal(saved.template, "RESEARCH");
});
test("the overview shows no percentage or progress bar when nothing is counted", async () => {
  const component = load("PrepOverview", {}, true);
  const subject = {
    title: "Meeting",
    description: "Discuss the rollout",
    status: "DRAFT",
    goal: "",
    eventAt: null,
    deadlineAt: null,
    progress: { total: 0, completed: 0, percent: 0 },
  };
  const html = await renderToString(
    vue.createSSRApp(component, { subject, timeZone: "Asia/Phnom_Penh" }),
  );
  assert.match(html, /Meeting/);
  assert.doesNotMatch(html, /0%|<progress|role="progressbar"/);
});

test("inline task editing sends a title-only patch and keeps a failed draft available", async () => {
  let success = false,
    calls: any[] = [];
  const item = { id: "task", title: "Original", isCompleted: false };
  const editor = load("PrepSection").setup(
    {
      section: sectionFixture(),
      notebook: true,
      mutate: async (...args: any[]) => {
        calls.push(args);
        return success;
      },
    },
    { expose() {}, emit() {} },
  );
  function sectionFixture() {
    return { ...section("check", "CHECKLIST", [item]) };
  }
  await editor.startTitleEdit(item);
  editor.draftTitle.value = "  Updated task  ";
  await editor.saveInlineTitle(item);
  assert.equal(editor.editingTitle.value, "task");
  assert.equal(editor.draftTitle.value, "  Updated task  ");
  assert.deepEqual(calls[0], [
    "/sections/check/items/task",
    "PATCH",
    { title: "Updated task" },
  ]);
  success = true;
  await editor.saveInlineTitle(item);
  assert.equal(editor.editingTitle.value, null);
});

import {
  ControlNode,
  controlRenderer,
  controlNodes,
  installControlDocument,
} from "./helpers/component-host.ts";
test("the main Add Task action focuses a single real input and successful inline save clears it", async () => {
  const restore = installControlDocument(),
    root = new ControlNode("root"),
    calls: any[] = [];
  const app = controlRenderer.createApp(load("PrepNotebook", {}, true), {
    sections: [],
    subjectId: "subject",
    timeZone: "Asia/Phnom_Penh",
    mutate: async () => true,
    confirm() {},
    createTask: async (...args: any[]) => {
      calls.push(args);
      return true;
    },
  });
  try {
    const instance = app.mount(root) as any;
    await vue.nextTick();
    const input = controlNodes(root).find((n) => n.tag === "input")!;
    Object.assign(input, { scrollIntoView() {} });
    await instance.focusTask();
    assert.equal((document as any).activeElement, input);
    input.value = "Collect references";
    input.dispatchEvent(new Event("input"));
    await vue.nextTick();
    await controlNodes(root)
      .find((n) => n.tag === "form")!
      .props.onSubmit({ preventDefault() {} });
    await vue.nextTick();
    assert.deepEqual(calls, [["Collect references", undefined]]);
    assert.equal(input.value, "");
    assert.equal((document as any).activeElement, input);
  } finally {
    app.unmount();
    restore();
  }
});
test("inline task creation creates a checklist only when needed and retries reuse the saved section", async () => {
  const calls: any[] = [];
  let sections: any[] = [],
    failItem = true;
  const subject = { id: "subject", sections };
  const hub = {
    owner: vue.ref("owner"),
    busy: vue.ref(false),
    error: vue.ref(""),
    feedback: vue.ref(""),
    timeZone: vue.ref("Asia/Phnom_Penh"),
    fail: (e: any) => (hub.error.value = e.message),
    request: async (path: string, options: any = {}) => {
      calls.push({ path, ...options });
      if (path === "/subjects/subject/sections") {
        const created = section("new", "CHECKLIST");
        sections.push(created);
        return created;
      }
      if (path.endsWith("/items")) {
        if (failItem) throw new Error("Offline");
        return { id: "task" };
      }
      return { ...subject, sections };
    },
  };
  const workspace = load("PrepWorkspace", hub).setup(
    { id: "subject" },
    { expose() {}, emit() {} },
  );
  assert.equal(await workspace.createTask("  Prepare slides  "), false);
  assert.equal(hub.error.value, "Offline");
  assert.equal(hub.busy.value, false);
  failItem = false;
  assert.equal(await workspace.createTask("Prepare slides"), true);
  assert.equal(
    calls.filter((c) => c.path === "/subjects/subject/sections").length,
    1,
  );
  assert.deepEqual(calls.find((c) => c.path.endsWith("/items")).body, {
    title: "Prepare slides",
  });
});
test("answering research changes only its status, preserving findings, references and optional task metadata", async () => {
  let call: any;
  const item = {
    id: "research",
    title: "Sync?",
    status: "RESEARCHING",
    findings: "Queue locally",
    sources: "https://example.com",
    isCompleted: false,
  };
  const editor = load("PrepSection").setup(
    {
      section: section("s", "RESEARCH", [item]),
      mutate: async (...args: any[]) => {
        call = args;
        return true;
      },
    },
    { expose() {}, emit() {} },
  );
  await editor.toggleItem(item);
  assert.deepEqual(call, [
    "/sections/s/items/research",
    "PATCH",
    { status: "ANSWERED" },
  ]);
  assert.equal(item.findings, "Queue locally");
  assert.equal(item.sources, "https://example.com");
});
test("capture uses the selected custom section rather than the first section of the same type", async () => {
  const calls: any[] = [];
  const subject = {
    id: "subject",
    sections: [section("first", "NOTES"), section("chosen", "NOTES")],
  };
  const hub = {
    owner: vue.ref("owner"),
    busy: vue.ref(false),
    error: vue.ref(""),
    fail() {},
    request: async (path: string, options: any = {}) => {
      calls.push({ path, ...options });
      return subject;
    },
  };
  const capture = load("PrepCapture", hub).setup(
    {
      subject,
      initialType: "NOTES",
      targetSectionId: "chosen",
      timeZone: "Asia/Phnom_Penh",
    },
    { expose() {}, emit() {} },
  );
  capture.selected.value = "subject";
  await capture.capture({ title: "Saved here" });
  assert.equal(calls[1].path, "/subjects/subject/sections/chosen/items");
});
test("ready and finish are deliberate status actions independent of remaining tasks", async () => {
  const calls: any[] = [];
  const hub = {
    owner: vue.ref("owner"),
    busy: vue.ref(false),
    error: vue.ref(""),
    feedback: vue.ref(""),
    timeZone: vue.ref("Asia/Phnom_Penh"),
    fail() {},
    request: async (path: string, options: any = {}) => {
      calls.push({ path, ...options });
      return { status: options.body?.status || "READY", sections: [] };
    },
  };
  const workspace = load("PrepWorkspace", hub).setup(
    { id: "subject" },
    { expose() {}, emit() {} },
  );
  workspace.subject.value = {
    status: "PREPARING",
    sections: [],
    progress: { remaining: 5 },
  };
  await workspace.primaryStatusAction();
  assert.equal(calls[0].body.status, "READY");
  await workspace.primaryStatusAction();
  assert.equal(calls[2].body.status, "COMPLETED");
});

test("a deep-link section seeds Add once without overriding a newer notebook interaction", () => {
  const restore = installControlDocument();
  Object.assign(window, { location: { hash: "#section-old" } });
  const hub = {
    owner: vue.ref("owner"),
    busy: vue.ref(false),
    error: vue.ref(""),
    feedback: vue.ref(""),
    timeZone: vue.ref("Asia/Phnom_Penh"),
  };
  try {
    const workspace = load("PrepWorkspace", hub).setup(
      { id: "subject" },
      { expose() {}, emit() {} },
    );
    workspace.subject.value = {
      sections: [section("old", "NOTES"), section("new", "RESEARCH")],
    };
    workspace.resolveAddContext();
    assert.equal(workspace.contextSection.value, "old");
    workspace.setAddContext("RESEARCH", "new");
    workspace.resolveAddContext();
    assert.equal(workspace.contextSection.value, "new");
    assert.equal(workspace.activeType.value, "RESEARCH");
  } finally {
    restore();
  }
});

test("the reference layout keeps the server progress in the checklist without counting saved materials", async () => {
  const component = load("PrepNotebook", {}, true);
  const html = await renderToString(
    vue.createSSRApp(component, {
      subjectId: "subject",
      timeZone: "Asia/Phnom_Penh",
      sections: [
        section("links", "LINKS", [{ id: "link", title: "Reference" }]),
      ],
      progress: { total: 3, completed: 1, percent: 33 },
      readOnly: true,
      mutate: async () => false,
      confirm() {},
    }),
  );
  assert.match(html, /1 \/ 3 completed/);
  assert.match(html, /<progress[^>]*value="1"[^>]*max="3"/);
  const empty = await renderToString(
    vue.createSSRApp(component, {
      subjectId: "subject",
      timeZone: "Asia/Phnom_Penh",
      sections: [],
      progress: { total: 0, completed: 0, percent: 0 },
      readOnly: true,
      mutate: async () => false,
      confirm() {},
    }),
  );
  assert.doesNotMatch(empty, /0%|<progress/);
});
test("the overview labels the time zone accurately and does not invent location or favorite actions", async () => {
  const html = await renderToString(
    vue.createSSRApp(load("PrepOverview", {}, true), {
      subject: {
        title: "POS Research",
        description: "Prepare recommendations",
        goal: "Compare offline approaches",
        status: "READY",
        eventAt: "2026-11-16T06:01:00Z",
        deadlineAt: null,
        progress: { total: 1, completed: 0, percent: 0 },
      },
      timeZone: "Asia/Phnom_Penh",
    }),
  );
  assert.match(html, /Time zone/);
  assert.match(html, /Asia\/Phnom_Penh/);
  assert.doesNotMatch(html, /Location|Favorite|<progress/);
});

test("reference file rows use actual counts and capability URLs while keeping public controls read-only", async () => {
  const resources = [
    {
      id: "pdf",
      title: "Offline report.pdf",
      extension: "pdf",
      mimeType: "application/pdf",
      fileSize: 370688,
    },
    {
      id: "photo",
      title: "Photo.jpg",
      extension: "jpg",
      mimeType: "image/jpeg",
      fileSize: 260000,
    },
    {
      id: "document",
      title: "Outline.docx",
      extension: "docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      fileSize: 1024,
    },
  ];
  const props = {
    section: {
      id: "files",
      title: "Files",
      type: "ATTACHMENTS",
      items: [],
      resources,
    },
    subjectId: "subject",
    timeZone: "Asia/Phnom_Penh",
    notebook: true,
    readOnly: true,
    resourceBase: "/api/prephub/public/token/resources",
    mutate: async () => false,
    confirm() {},
  };
  const html = await renderToString(
    vue.createSSRApp(load("PrepSection", {}, true), props),
  );
  assert.match(html, /3 files/);
  assert.match(html, /Offline report.pdf/);
  assert.match(html, /362.0 KiB/);
  assert.match(html, /\/api\/prephub\/public\/token\/resources\/pdf/);
  assert.doesNotMatch(html, /\/subjects\/subject|<button|type="file"/);
  assert.equal((html.match(/aria-label="Preview:/g) || []).length, 2);
  assert.equal((html.match(/aria-label="Download:/g) || []).length, 3);
});
test("reference link rows show only the stored label and description with safe external navigation", async () => {
  const item = {
    id: "link",
    title: "Architecture",
    url: "https://example.com/architecture",
    label: "Offline checkout",
    content: "Saved by the owner",
    isCompleted: false,
    isRequired: false,
  };
  const html = await renderToString(
    vue.createSSRApp(load("PrepSection", {}, true), {
      section: section("references", "LINKS", [item]),
      subjectId: "subject",
      timeZone: "Asia/Phnom_Penh",
      notebook: true,
      readOnly: true,
      mutate: async () => false,
      confirm() {},
    }),
  );
  assert.match(html, /1 link/);
  assert.match(html, /Offline checkout/);
  assert.match(html, /Saved by the owner/);
  assert.match(
    html,
    /href="https:\/\/example.com\/architecture"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
  );
  assert.doesNotMatch(html, /<button|Technical Architecture|Success Criteria/);
});

test("optional checklist entries do not produce a false empty-task message or a readiness percentage", async () => {
  const html = await renderToString(
    vue.createSSRApp(load("PrepNotebook", {}, true), {
      subjectId: "subject",
      timeZone: "Asia/Phnom_Penh",
      sections: [
        section("optional", "CHECKLIST", [
          {
            id: "o",
            title: "Optional reading",
            isRequired: false,
            isCompleted: false,
          },
        ]),
      ],
      progress: { total: 0, completed: 0, percent: 0 },
      readOnly: true,
      mutate: async () => false,
      confirm() {},
    }),
  );
  assert.doesNotMatch(html, /No preparation tasks yet|0%|<progress/);
  assert.match(html, /Optional tasks/);
});
