import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { loadCalendarComponent } from "./helpers/load-calendar-component.ts";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import { toKhmerDigits } from "../app/lib/khmer-calendar.ts";
import { renderToString } from "vue/server-renderer";
import {
  getRosterDayColors,
  computeMonthlyRosterSummary,
  DEFAULT_PREFERENCES,
  DEFAULT_SHIFTS,
} from "../app/lib/roster.ts";

function loadExport(
  capture: (...args: any[]) => Promise<string>,
  pdf?: any,
  render = false,
) {
  const filename = new URL(
    "../app/components/roster/RosterExportModal.vue",
    import.meta.url,
  ).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const compiled = compileScript(descriptor, {
    id: "roster-export-test",
    inlineTemplate: render,
  });
  const code = ts.transpileModule(compiled.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const deps: Record<string, unknown> = {
    vue: { ...vue, onBeforeUnmount() {} },
    "lucide-vue-next": icons,
    "html-to-image": { toPng: capture },
    jspdf: { __esModule: true, default: pdf },
    "~/lib/khmer-calendar": { toKhmerDigits },
    "~/lib/roster": { getRosterDayColors },
    "~/components/roster/RosterEntryBadge.vue": { __esModule: true, default: loadCalendarComponent("app/components/roster/RosterEntryBadge.vue") },
  };
  const module = { exports: {} as any };
  const globals = { ...vue, onMounted() {}, onBeforeUnmount() {} };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => {
      assert.ok(name in deps, `Unexpected dependency ${name}`);
      return deps[name];
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  if (render) return module.exports.default;
  return module.exports.default.setup(
    { year: 2026, month: 11, days: [], khmer: false },
    { expose() {}, emit() {} },
  );
}

test("PNG captures the entire unscaled card after fonts have loaded", async () => {
  let releaseFonts!: () => void;
  const ready = new Promise<void>((resolve) => {
    releaseFonts = resolve;
  });
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  let captured = false;
  let clicked = false;
  const card = {
    scrollWidth: 1000,
    scrollHeight: 1500,
    offsetWidth: 1000,
    offsetHeight: 1500,
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      fonts: { ready },
      createElement: () => ({
        click() {
          clicked = true;
        },
      }),
    },
  });
  try {
    const component = loadExport(async (node, options) => {
      captured = true;
      assert.equal(vue.toRaw(node), card);
      assert.equal(options.width, 1000);
      assert.equal(options.height, 1500);
      assert.equal(options.style.transform, "none");
      assert.equal(options.style.maxWidth, "none");
      return "data:image/png;base64,test";
    });
    component.printCardRef.value = card;
    const pending = component.exportPNG();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
      captured,
      false,
      "Khmer fonts must be ready before measuring and capturing",
    );
    releaseFonts();
    await pending;
    assert.equal(captured, true);
    assert.equal(clicked, true);
    assert.equal(component.exporting.value, false);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("shared export card omits remaining PHL and AL balances in both languages", async () => {
  for (const khmer of [false, true]) {
    const component = loadExport(async () => "", undefined, true);
    const summary = {
      ...computeMonthlyRosterSummary(
        2026,
        11,
        [],
        DEFAULT_PREFERENCES,
        new Map(),
      ),
      alRemaining: 8675309,
      phlRemaining: 1234567,
      alUsed: 3.5,
      phlUsed: 5,
    };
    const context: Record<string, any> = {};
    await renderToString(
      vue.createSSRApp(component, {
        open: true,
        year: 2026,
        month: 11,
        monthTitle: "November 2026",
        days: [],
        shiftsByCode: new Map(),
        preferences: DEFAULT_PREFERENCES,
        summary,
        khmer,
      }),
      context,
    );
    const html = context.teleports.body;
    assert.ok(!html.includes(khmer ? toKhmerDigits(8675309) : "8675309"));
    assert.ok(!html.includes(khmer ? toKhmerDigits(1234567) : "1234567"));
    assert.ok(html.includes(khmer ? "បានប្រើ" : "Used"));
    assert.ok(html.includes("PHL"));
    assert.ok(html.includes("AL"));
  }
});

test("export keeps full-day colors with plain codes and times instead of icon badges", async () => {
  const component = loadExport(async () => "", undefined, true);
  const days = [
    {
      entryDate: "2026-11-02",
      shiftCode: "K123",
      leaveCode: null,
      status: "DRAFT",
    },
    {
      entryDate: "2026-11-03",
      shiftCode: null,
      leaveCode: "PRD",
      status: "DRAFT",
    },
    { entryDate: "2026-11-04", shiftCode: null, leaveCode: "PHL", status: "DRAFT" },
    { entryDate: "2026-11-05", shiftCode: null, leaveCode: "AL", status: "DRAFT" },
  ];
  const context: Record<string, any> = {};
  await renderToString(
    vue.createSSRApp(component, {
      open: true,
      year: 2026,
      month: 11,
      monthTitle: "November",
      days,
      shiftsByCode: new Map(DEFAULT_SHIFTS.map((shift) => [shift.code, shift])),
      preferences: DEFAULT_PREFERENCES,
      summary: computeMonthlyRosterSummary(
        2026,
        11,
        [],
        DEFAULT_PREFERENCES,
        new Map(),
      ),
      khmer: false,
    }),
    context,
  );
  assert.match(
    context.teleports.body,
    /<td[^>]*style="background-color:#ecfdf5;/,
  );
  assert.match(
    context.teleports.body,
    /<td[^>]*style="background-color:#fff1f2;/,
  );
  assert.match(context.teleports.body, /<td[^>]*style="background-color:#fffbeb;/);
  assert.match(context.teleports.body, /<td[^>]*style="background-color:#faf5ff;/);
  const table = context.teleports.body.match(/<table[\s\S]*?<\/table>/)?.[0] ?? "";
  assert.ok(table.includes("K123"));
  assert.doesNotMatch(table, /<svg/);
  assert.match(context.teleports.body, /09:00 – 18:30/);
});

test("PDF fits a tall six-week roster inside both page dimensions", async () => {
  let image: any[] = [];
  let saved = false;
  class PDF {
    internal = { pageSize: { getWidth: () => 297, getHeight: () => 210 } };
    getImageProperties() {
      return { width: 2000, height: 3200 };
    }
    addImage(...args: any[]) {
      image = args;
    }
    save() {
      saved = true;
    }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { fonts: { ready: Promise.resolve() } },
  });
  try {
    const component = loadExport(async () => "data:image/png;base64,test", PDF);
    component.printCardRef.value = { scrollWidth: 1000, scrollHeight: 1600 };
    await component.exportPDF();
    assert.equal(saved, true);
    const [, , x, y, width, height] = image;
    assert.ok(x >= 10 && y >= 10);
    assert.ok(
      x + width <= 287 && y + height <= 200,
      "No part of the roster may fall outside A4 margins",
    );
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});

test("failed image capture gives visible feedback and permits retry", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { fonts: { ready: Promise.resolve() } },
  });
  try {
    const component = loadExport(async () => {
      throw new Error("Canvas failed");
    });
    component.printCardRef.value = { scrollWidth: 1000, scrollHeight: 1000 };
    await component.exportPNG();
    assert.ok(component.exportError.value.length > 0);
    assert.equal(component.exporting.value, false);
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
