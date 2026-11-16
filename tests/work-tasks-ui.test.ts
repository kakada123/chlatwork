import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as domain from "../app/lib/work-tasks.ts";
import * as exporter from "../app/lib/tasks-report-export.ts";
function setup(name: string, props: any, extra: Record<string, unknown> = {}) {
  const filename =
      name === "TasksPage"
        ? "app/pages/tasks/index.vue"
        : `app/components/tasks/${name}.vue`,
    { descriptor } = parse(
      readFileSync(new URL("../" + filename, import.meta.url), "utf8"),
      { filename },
    ),
    code = ts.transpileModule(compileScript(descriptor, { id: name }).content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    mod = { exports: {} as any },
    globals = {
      ...vue,
      useAppI18n: () => ({ t: (key: string) => key }),
      onMounted() {},
      onBeforeUnmount() {},
      ...extra,
    };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (path: string) =>
      path === "vue"
        ? vue
        : path === "~/lib/work-tasks"
          ? domain
          : path === "~/lib/tasks-report-export"
            ? exporter
            : {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default.setup(props, { expose() {}, emit() {} });
}
const catalog = { timeZone: "Asia/Phnom_Penh", projects: [], objectives: [] };
test("work log saves completed work at the actual backdated local date with impact and evidence", async () => {
  let body: any;
  const editor = setup("TaskForm", {
    catalog,
    logDone: true,
    busy: false,
    submit: async (value: any) => {
      body = value;
      return true;
    },
  });
  Object.assign(editor.form, {
    title: "Fixed POS voucher",
    completedAt: "2026-11-01T14:00",
    impact: "Corrected checkout totals",
    evidence: "https://example.com/pr/1",
    objectiveIds: ["objective"],
  });
  await editor.save();
  assert.equal(body.status, "DONE");
  assert.equal(body.completedAt, "2026-11-01T07:00:00.000Z");
  assert.equal(body.impact, "Corrected checkout totals");
  assert.deepEqual(body.evidence, ["https://example.com/pr/1"]);
  assert.deepEqual(body.objectiveIds, ["objective"]);
});
test("task edit does not manufacture a completion date while reopening", async () => {
  let body: any;
  const editor = setup("TaskForm", {
    catalog,
    logDone: false,
    busy: false,
    submit: async (value: any) => {
      body = value;
      return true;
    },
  });
  editor.form.title = "Task";
  editor.form.status = "PLANNED";
  await editor.save();
  assert.equal(body.completedAt, undefined);
  assert.equal(body.projectId, null);
  assert.equal(body.dueAt, null);
});
test("editing a report draft invalidates the export preview without writing original tasks", () => {
  const calls: any[] = [];
  const builder = setup("TaskReportBuilder", {
    catalog,
    busy: false,
    mutate: (...args: any[]) => {
      calls.push(args);
    },
    request: async () => [],
  });
  builder.report.value = { draft: { summary: "old" } };
  builder.form.summary = "My actual results";
  assert.equal(builder.report.value, null);
  assert.equal(calls.length, 0);
});
test("follow-up reschedule targets the follow-up without reopening its completed task", async () => {
  const calls: any[] = [];
  const follow = setup("TaskFollowUps", {
    items: [],
    timeZone: catalog.timeZone,
    busy: false,
    taskId: "task",
    mutate: async (...args: any[]) => {
      calls.push(args);
      return {};
    },
    request: async () => ({ items: [] }),
  });
  follow.edit({
    id: "follow",
    taskId: "task",
    followUpAt: "2026-11-17T00:00:00Z",
    note: "Verify deployment",
    nextAction: "Check production",
    remindAt: null,
  });
  follow.form.followUpAt = "2026-11-18T07:00";
  await follow.save();
  assert.equal(calls[0][0], "/follow-ups/follow");
  assert.equal(calls[0][1], "PATCH");
  assert.equal(calls[0][2].followUpAt, "2026-11-18T00:00:00.000Z");
  assert.equal(calls[0][2].status, undefined);
});

test("editing completed work preserves the exact completion instant and repeated-hour occurrence", async () => {
  for (const [zone, completedAt] of [
    ["Asia/Phnom_Penh", "2026-11-16T08:15:42.123Z"],
    ["America/New_York", "2026-11-01T06:30:00.000Z"],
  ]) {
    let body: any;
    const editor = setup("TaskForm", {
      catalog: { ...catalog, timeZone: zone },
      task: {
        id: "t",
        title: "Task",
        status: "DONE",
        completedAt,
        objectives: [],
        tags: [],
        evidence: [],
      },
      busy: false,
      submit: async (value: any) => {
        body = value;
        return true;
      },
    });
    editor.form.title = "Renamed";
    await editor.save();
    assert.equal(body.completedAt, completedAt);
  }
});

test("leaving a task while its request is pending clears the loading state", async () => {
  const route = vue.reactive({
    path: "/tasks",
    query: { task: "task" } as Record<string, string>,
  });
  let resolve: (value: any) => void = () => {};
  const hub = {
    owner: vue.ref("owner"),
    timeZone: vue.ref("Asia/Phnom_Penh"),
    error: vue.ref(""),
    feedback: vue.ref(""),
    busy: vue.ref(false),
    request: () => new Promise((r) => (resolve = r)),
    fail() {},
  };
  const page = setup(
    "TasksPage",
    {},
    {
      useRoute: () => route,
      useRouter: () => ({ push() {}, replace() {} }),
      useProductDomain: () => ({ linkTo: (path: string) => path }),
      useTasksClient: () => hub,
      definePageMeta() {},
      useSeoMeta() {},
    },
  );
  const pending = page.loadDetail();
  assert.equal(page.detailLoading.value, true);
  route.query = {};
  await page.loadDetail();
  assert.equal(page.detailLoading.value, false);
  resolve({ id: "task" });
  await pending;
  assert.equal(page.selected.value, null);
});
