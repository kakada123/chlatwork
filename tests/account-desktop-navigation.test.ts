import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, compileStyle, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as navigation from "../app/lib/account-navigation.ts";

function compileComponent(path: string, globals: Record<string, unknown> = {}, inlineTemplate = false) {
  const { descriptor } = parse(readFileSync(path, "utf8"), { filename: path });
  const script = compileScript(descriptor, { id: "account-desktop-test", inlineTemplate });
  const code = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const bindings = {
    ref: vue.ref, computed: vue.computed, nextTick: vue.nextTick,
    onMounted() {}, onBeforeUnmount() {}, definePageMeta() {}, useSeoMeta() {},
    ...globals,
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(bindings), code)(
    (name: string) => {
      if (name === "vue") return { ...vue, withAsyncContext: (work: () => unknown) => [work(), () => {}] };
      if (name === "~/lib/account-navigation") return navigation;
      if (name === "lucide-vue-next") return new Proxy({}, { get: () => ({}) });
      if (name.endsWith(".vue")) return { default: {} };
      if (name === "~/data/tools") return { LANDING_TOOLS: [] };
      if (name === "~/data/developer-commands") return { DEVELOPER_COMMANDS: [] };
      return {};
    }, module, module.exports, ...Object.values(bindings),
  );
  return module.exports.default;
}

function buttons(node: any): any[] {
  if (!node || typeof node !== "object") return [];
  const descendants = Array.isArray(node.children) ? node.children.flatMap(buttons) : [];
  return node.type === "button" ? [node, ...descendants] : descendants;
}

test("desktop menu selects every visible section and marks only the current destination", () => {
  const component = compileComponent("app/components/account/AccountDesktopNavigation.vue", {}, true);
  const props = vue.reactive({ activeSection: "overview", commandsEnabled: true });
  const selections: string[] = [];
  const render = component.setup(props, { expose() {} });
  const context = { $emit: (event: string, section: string) => {
    assert.equal(event, "select");
    selections.push(section);
    props.activeSection = section;
  } };

  for (const section of navigation.DESKTOP_ACCOUNT_SECTIONS) {
    const items = buttons(render(context, []));
    const item = items.find((entry) => entry.children.some((child: any) => child.children?.includes(section.title)));
    assert.ok(item, `${section.title} can be reached`);
    item.props.onClick();
    const current = buttons(render(context, [])).filter((entry) => entry.props["aria-current"] === "page");
    assert.equal(current.length, 1);
    assert.equal(selections.at(-1), section.key);
    assert.equal(current[0].props["aria-controls"], "account-desktop-content");
  }

  props.commandsEnabled = false;
  assert.equal(buttons(render(context, [])).length, navigation.DESKTOP_ACCOUNT_SECTIONS.length - 1);
});

async function accountFixture() {
  const commandsEnabled = vue.ref(true);
  const stops: (() => void)[] = [];
  const component = compileComponent("app/pages/account.vue", {
    useAuth: () => ({ user: vue.ref({ name: "Demo", providers: [] }), logout() {} }),
    useRoute: () => ({ query: {} }),
    useColorMode: () => ({ isDark: vue.ref(false), nextColorModeLabel: vue.ref("Dark"), toggleColorMode() {} }),
    useLanguage: () => ({ localizeTool: (item: unknown) => item }),
    useMomentLanguage: () => ({ localizeMomentPath: (path: string) => path }),
    useToolFavorites: () => ({ favoriteToolKeys: vue.ref([]), favoritesReady: vue.ref(true), favoriteError: vue.ref("") }),
    useCommandFavorites: () => ({ favoriteCommandIds: vue.ref([]), toggleCommandFavorite() {}, isFavoriteSaving() {} }),
    useToolUsage: () => ({ clearToolUsage() {}, getToolUsageSummary() {} }),
    useQuickExpense: () => ({ enabled: vue.ref(false), isLoading: vue.ref(false), updateEnabled() {} }),
    useTelegramNotifications: () => ({ settings: vue.ref(null), isLoading: vue.ref(false), load() {}, update() {} }),
    useTelegramPhone: () => ({}),
    useFetch: async () => ({ data: vue.ref([]), status: vue.ref("success"), error: vue.ref(null) }),
    useFeatureAvailability: () => ({ websiteEnabled: (key: string) => key !== "developer-commands" || commandsEnabled.value }),
    watch: (...args: any[]) => { const stop = (vue.watch as any)(...args); stops.push(stop); },
  });
  const state = await component.setup({}, { expose() {} });
  return { state, commandsEnabled, stop: () => stops.forEach((stop) => stop()) };
}

test("desktop selection shows one panel, resets its scroll, and keeps mobile section state independent", async () => {
  const { state, stop } = await accountFixture();
  const scrolls: unknown[] = [];
  const focus: unknown[] = [];
  try {
    state.mobileAccountSection.value = "expenses";
    state.accountContent.value = { scrollTo: (options: unknown) => scrolls.push(options), focus: (options: unknown) => focus.push(options) };
    for (const section of navigation.DESKTOP_ACCOUNT_SECTIONS) {
      await state.openDesktopAccountSection(section.key);
      assert.equal(state.desktopAccountSectionTitle.value, section.title);
      assert.equal(state.desktopPanelClass(section.key)["account-panel-hidden"], false);
      assert.equal(navigation.DESKTOP_ACCOUNT_SECTIONS.filter((item) => !state.desktopPanelClass(item.key)["account-panel-hidden"]).length, 1);
      assert.equal(state.mobileAccountSection.value, "expenses");
    }
    assert.equal(scrolls.length, navigation.DESKTOP_ACCOUNT_SECTIONS.length);
    assert.deepEqual(scrolls[0], { top: 0, behavior: "auto" });
    assert.deepEqual(focus[0], { preventScroll: true });
  } finally { stop(); }
});

test("disabling developer commands returns an open commands panel to Overview", async () => {
  const { state, commandsEnabled, stop } = await accountFixture();
  try {
    await state.openDesktopAccountSection("favorite-commands");
    commandsEnabled.value = false;
    await vue.nextTick();
    assert.equal(state.desktopAccountSection.value, "overview");
  } finally { stop(); }
});

test("viewport containment and panel hiding apply only at the desktop breakpoint", () => {
  for (const path of ["app/pages/account.vue", "app/layouts/account.vue"]) {
    const { descriptor } = parse(readFileSync(path, "utf8"), { filename: path });
    const style = descriptor.styles[0];
    assert.ok(style.scoped);
    assert.match(style.content.trim(), /^@media \(min-width: 1024px\)/);
    const compiled = compileStyle({ filename: path, source: style.content, id: "account-test", scoped: true });
    assert.equal(compiled.errors.length, 0);
  }
  const page = readFileSync("app/pages/account.vue", "utf8");
  assert.match(page, /layout: "account"/);
  assert.match(page, /overflow-y: auto/);
  assert.match(page, /aria-label="ChlatWork information"/);
});
