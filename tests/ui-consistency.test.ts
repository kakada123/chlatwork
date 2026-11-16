import { loadCalendarLanguage } from "./helpers/load-calendar-language.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import * as vue from "vue";
import { renderToString } from "@vue/server-renderer";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as icons from "lucide-vue-next";
import * as tasks from "../app/lib/work-tasks.ts";
import * as domains from "../app/lib/product-domains.ts";
import { getDatePickerPosition } from "../app/lib/date-picker-position.ts";
function load(
  path: string,
  product = "tasks",
  calendarLocale = vue.ref<"en" | "km">("km"),
  query: Record<string, unknown> = {},
) {
  const filename = new URL("../" + path, import.meta.url).pathname,
    { descriptor } = parse(readFileSync(filename, "utf8"), { filename }),
    compiled = compileScript(descriptor, {
      id: "consistency",
      inlineTemplate: true,
    }),
    code = ts.transpileModule(compiled.content, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
  const i18n = { useAppI18n: () => ({ t: (key: string) => key }) },
    language = {
      useLanguage: () => ({
        isKhmer: vue.ref(false),
        languageLabel: vue.ref("KM"),
        switchLanguage() {},
      }),
    };
  const globals = {
    ...vue,
    useAppI18n: i18n.useAppI18n,
    useProductDomain: () => ({
      product,
      config: { mainOrigin: "https://chlatwork.com" },
      linkTo: (path: string) => path,
    }),
    useLanguage: language.useLanguage,
    useColorMode: () => ({
      isDark: vue.ref(false),
      toggleColorMode() {},
      nextColorModeLabel: vue.ref("Dark mode"),
    }),
    useAuth: () => ({
      user: vue.ref({ id: "fixture" }),
      isReady: vue.ref(true),
    }),
    useFeatureAvailability: () => ({ websiteEnabled: () => true }),
    useRoute: () => ({ fullPath: "/", path: "/" }),
    useState: () => vue.ref(null),
  };
  const deps: Record<string, unknown> = {
    vue,
    "lucide-vue-next": icons,
    "~/composables/useAppI18n": i18n,
    "~/composables/useCalendarLanguage": {
      useCalendarLanguage: () => loadCalendarLanguage(calendarLocale, query),
    },
    "~/composables/useLanguage": language,
    "~/lib/work-tasks": tasks,
    "~/lib/product-domains": domains,
    "~/lib/date-picker-position": { getDatePickerPosition },
    "~/composables/useQuickExpense": {
      openQuickExpense() {},
      useQuickExpense: () => ({ enabled: vue.ref(false) }),
    },
  };
  const mod = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => deps[name] ?? {},
    mod,
    mod.exports,
    ...Object.values(globals),
  );
  return mod.exports.default;
}
async function render(component: any, props: Record<string, unknown> = {}) {
  const app = vue.createSSRApp({ render: () => vue.h(component, props) });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (p: any, { slots }: any) =>
      () =>
        vue.h(
          "a",
          { href: typeof p.to === "string" ? p.to : p.to?.path },
          slots.default?.(),
        ),
  });
  app.component("ModernSelect", { setup: () => () => vue.h("span") });
  return renderToString(app);
}
test("every product has one shared header row and the same visible account/theme controls", async () => {
  for (const product of Object.keys(domains.PRODUCTS)) {
    const html = await render(
      load("app/components/layout/ProductNavigation.vue", product),
    );
    assert.equal((html.match(/<header/g) || []).length, 1, product);
    assert.match(html, /data-product-header/);
    assert.match(html, /shared.common.account/);
    assert.match(html, /Dark mode/);
    assert.match(html, /catalog.shell.nav.switch_to_/);
  }
});
test("the product header is mounted once at the app boundary rather than separately by product layouts", () => {
  const app = readFileSync("app/app.vue", "utf8");
  assert.match(app, /<LayoutProductNavigation[^>]*domainContext\.product/);
  for (const layout of ["default", "creator", "food", "tasks", "jekluy"]) {
    const source = readFileSync(`app/layouts/${layout}.vue`, "utf8");
    assert.doesNotMatch(
      source,
      /<LayoutProductNavigation v-if="domainProduct"/,
    );
  }
});
test("workspace date and select fields reuse modern shared controls", () => {
  const files = [
    ...["app/components/tasks", "app/components/prephub"].flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".vue"))
        .map((f) => dir + "/" + f),
    ),
    "app/pages/tasks/index.vue",
    "app/pages/prephub/index.vue",
  ];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /<select\b/, file);
    assert.doesNotMatch(
      source,
      /<input\b[^>]*type="(?:date|datetime-local)"/s,
      file,
    );
  }
});
test("shared modern date input preserves required, disabled and native value semantics", async () => {
  const html = await render(load("app/components/ModernDateInput.vue"), {
    modelValue: "2026-11-16T02:00",
    type: "datetime-local",
    required: true,
    disabled: true,
    name: "eventAt",
    ariaLabel: "Event time",
  });
  assert.match(
    html,
    /<input[^>]*type="datetime-local"[^>]*value="2026-11-16T02:00"/,
  );
  assert.match(html, /<input[^>]*required/);
  assert.match(html, /<button[^>]*disabled/);
  assert.match(html, /Event time/);
});

import {
  ControlNode,
  controlRenderer,
  controlNodes,
  installControlDocument,
} from "./helpers/component-host.ts";
async function mountControl(
  path: string,
  props: Record<string, unknown>,
  model = vue.ref(""),
  label = "",
) {
  const restore = installControlDocument(),
    root = new ControlNode("root"),
    events: Event[] = [];
  const component = load(path),
    app = controlRenderer.createApp({
      setup: () => () => {
        const control = vue.h(component, {
          ...props,
          modelValue: model.value,
          "onUpdate:modelValue": (value: string) => (model.value = value),
          onChange: (event: Event) => events.push(event),
        });
        return label ? vue.h("label", [label, control]) : control;
      },
    });
  app.component("ModernSelect", { setup: () => () => vue.h("span") });
  app.component("NuxtLink", {
    props: ["to"],
    setup:
      (p: any, { slots }: any) =>
      () =>
        vue.h("a", { to: p.to }, slots.default?.()),
  });
  app.mount(root);
  await vue.nextTick();
  return {
    root,
    model,
    events,
    nodes: () => controlNodes(root),
    unmount() {
      app.unmount();
      restore();
    },
  };
}
test("date selection commits once with the native event target and returns focus to the labeled trigger", async () => {
  const view = await mountControl(
    "app/components/ModernDateInput.vue",
    { required: true, name: "dueAt", id: "dueAt" },
    vue.ref("2026-11-16"),
  );
  try {
    const trigger = view.nodes().find((n) => n.props.id === "dueAt")!;
    await trigger.props.onClick({ stopPropagation() {} });
    await vue.nextTick();
    const day = view
      .nodes()
      .find(
        (n) =>
          n.tag === "button" &&
          n.props["aria-pressed"] === false &&
          n.textContent === "17",
      )!;
    assert.ok(day);
    day.props.onClick();
    await vue.nextTick();
    await vue.nextTick();
    assert.equal(view.model.value, "2026-11-17");
    assert.equal(view.events.length, 1);
    const target = view.events[0].target as ControlNode;
    assert.equal(target.tag, "input");
    assert.equal(target.value, "2026-11-17");
    assert.equal(target.props.name, "dueAt");
    assert.equal((document as any).activeElement, trigger);
    assert.equal(
      view.nodes().some((n) => n.props.popover),
      false,
    );
  } finally {
    view.unmount();
  }
});
test("date-time editing keeps the chosen time, supports clearing, and exposes native validation on its visible trigger", async () => {
  const view = await mountControl(
    "app/components/ModernDateInput.vue",
    { type: "datetime-local", required: true, id: "schedule" },
    vue.ref("2026-11-16T02:00"),
  );
  try {
    let trigger = view.nodes().find((n) => n.props.id === "schedule")!;
    await trigger.props.onClick({ stopPropagation() {} });
    await vue.nextTick();
    view
      .nodes()
      .find(
        (n) =>
          n.tag === "button" &&
          n.props["aria-pressed"] === false &&
          n.textContent === "17",
      )!
      .props.onClick();
    await vue.nextTick();
    await vue.nextTick();
    assert.equal(view.model.value, "2026-11-17T02:00");
    assert.ok(view.nodes().find((n) => n.props.popover));
    const time = view.nodes().find((n) => n.props.type === "time")!;
    time.value = "16:30";
    time.dispatchEvent(new Event("input"));
    time.dispatchEvent(new Event("change"));
    await vue.nextTick();
    await vue.nextTick();
    assert.equal(view.model.value, "2026-11-17T16:30");
    assert.equal(view.events.length, 2);
    view
      .nodes()
      .find(
        (n) =>
          n.tag === "button" && n.textContent.includes("shared.common.clear"),
      )!
      .props.onClick();
    await vue.nextTick();
    await vue.nextTick();
    assert.equal(view.model.value, "");
    view
      .nodes()
      .find((n) => n.props.class === "modern-date-native")!
      .dispatchEvent(new Event("invalid", { cancelable: true }));
    await vue.nextTick();
    trigger = view.nodes().find((n) => n.props.id === "schedule")!;
    assert.equal(trigger.props["aria-invalid"], true);
    assert.equal((document as any).activeElement, trigger);
  } finally {
    view.unmount();
  }
});
test("disabled date controls cannot open a calendar", async () => {
  const view = await mountControl("app/components/ModernDateInput.vue", {
    disabled: true,
    id: "disabled",
  });
  try {
    await view
      .nodes()
      .find((n) => n.props.id === "disabled")!
      .props.onClick({ stopPropagation() {} });
    await vue.nextTick();
    assert.equal(
      view.nodes().some((n) => n.props.popover),
      false,
    );
  } finally {
    view.unmount();
  }
});
test("mobile filters toggle without removing their desktop controls or stored field values", async () => {
  const view = await mountControl(
    "app/components/layout/WorkspaceFilters.vue",
    { count: 2 },
  );
  try {
    const trigger = view.nodes().find((n) => n.tag === "button")!;
    assert.equal(trigger.props["aria-expanded"], false);
    assert.ok(view.nodes().some((n) => n.props.class === "hidden sm:block"));
    trigger.props.onClick();
    await vue.nextTick();
    assert.equal(trigger.props["aria-expanded"], true);
    assert.equal(
      view.nodes().some((n) => n.props.class === "hidden sm:block"),
      false,
    );
    trigger.props.onClick();
    await vue.nextTick();
    assert.equal(trigger.props["aria-expanded"], false);
  } finally {
    view.unmount();
  }
});

test("date triggers retain implicit field names despite the native validation proxy appearing first", async () => {
  const view = await mountControl(
    "app/components/ModernDateInput.vue",
    { id: "named", "aria-describedby": "hint" },
    vue.ref(""),
    "Completion date",
  );
  try {
    const native = view
        .nodes()
        .find((n) => n.props.class === "modern-date-native")!,
      trigger = view.nodes().find((n) => n.props.id === "named")!;
    assert.equal(trigger.labels.length, 0);
    assert.equal(native.labels.length, 1);
    assert.equal(trigger.props["aria-label"], "Completion date");
    assert.equal(trigger.props["aria-describedby"], "hint");
    Object.assign(native, {
      validationMessage: "Date must be after November 16.",
    });
    native.dispatchEvent(new Event("invalid", { cancelable: true }));
    await vue.nextTick();
    assert.ok(
      view
        .nodes()
        .some(
          (n) =>
            n.props.role === "alert" &&
            n.textContent === "Date must be after November 16.",
        ),
    );
    assert.match(trigger.props["aria-describedby"], /hint.*named-error/);
  } finally {
    view.unmount();
  }
});
test("mobile task navigation reaches every view and returns after the text keyboard closes", async () => {
  const view = await mountControl(
    "app/components/tasks/TasksMobileNavigation.vue",
    { view: "tasks", path: "/tasks", ready: true },
  );
  try {
    const destinations = view
      .nodes()
      .filter((n) => n.tag === "a")
      .map((n) => n.props.to.query.view);
    assert.deepEqual(
      [...new Set(destinations)].sort(),
      [...tasks.TASK_VIEWS].sort(),
    );
    const input = new HTMLInputElement("input") as unknown as ControlNode;
    (document as any).activeElement = input;
    document.dispatchEvent(new Event("focusin"));
    await vue.nextTick();
    await vue.nextTick();
    assert.equal(
      view
        .nodes()
        .some((n) => n.props["data-tasks-mobile-navigation"] !== undefined),
      false,
    );
    document.dispatchEvent(new Event("focusout"));
    (document as any).activeElement = null;
    await vue.nextTick();
    await vue.nextTick();
    assert.ok(
      view
        .nodes()
        .some((n) => n.props["data-tasks-mobile-navigation"] !== undefined),
    );
  } finally {
    view.unmount();
  }
});

test("calendar shared chrome honors explicit language links without changing the server cookie while rendering", async () => {
  const locale = vue.ref<"en" | "km">("km"),
    query = vue.reactive({ lang: "en", mode: "roster" });
  const header = await render(
    load(
      "app/components/layout/ProductNavigation.vue",
      "calendar",
      locale,
      query,
    ),
  );
  assert.match(header, /catalog.shell.nav.switch_to_khmer/);
  const calendar = loadCalendarLanguage(locale, query);
  assert.equal(calendar.isKhmer.value, false);
  assert.equal(locale.value, "km");
  calendar.switchLanguage();
  assert.equal(query.lang, "km");
  assert.equal(query.mode, "roster");
  assert.equal(calendar.isKhmer.value, true);
  assert.equal(locale.value, "km");
  calendar.switchLanguage();
  assert.equal(query.lang, "en");
  assert.equal(locale.value, "en");
});
