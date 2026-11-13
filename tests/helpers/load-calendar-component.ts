import { getRosterDayColors } from "../../app/lib/roster.ts";
import { createI18nStub } from "./i18n-stubs.ts";
import { translateMessage } from "../../app/lib/i18n.ts";
import { readFileSync } from "node:fs";
import * as vue from "vue";
import * as icons from "lucide-vue-next";
import { compileScript, parse } from "@vue/compiler-sfc";
import { useHead, useSeoMeta } from "@unhead/vue";
import ts from "../../api/node_modules/typescript/lib/typescript.js";
import * as calendar from "../../app/lib/khmer-calendar.ts";
import * as sharing from "../../app/lib/calendar-sharing.ts";
import * as holidays from "../../app/data/cambodia-holidays.ts";
import * as celebrations from "../../app/data/calendar-celebrations.ts";

export function loadCalendarComponent(
  filename: string,
  options: {
    route?: any;
    inlineTemplate?: boolean;
    navigateTo?: (path: string) => unknown;
  } = {},
) {
  const file = new URL(`../../${filename}`, import.meta.url).pathname;
  const { descriptor, errors } = parse(readFileSync(file, "utf8"), {
    filename: file,
  });
  if (errors.length) throw errors[0];
  const compiled = compileScript(descriptor, {
    id: "calendar-component-test",
    inlineTemplate: options.inlineTemplate !== false,
  });
  const code = ts.transpileModule(compiled.content, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const dependencies: Record<string, unknown> = {
    vue,
    "~/composables/useAppI18n": { useAppI18n: createI18nStub },
    "~/lib/i18n": { translateMessage },
    "lucide-vue-next": icons,
    "~/lib/khmer-calendar": calendar,
    "~/lib/calendar-sharing": sharing,
    "~/data/cambodia-holidays": holidays,
    "~/data/calendar-celebrations": celebrations,
    "~/composables/useColorMode": { useColorMode: () => ({ isDark: vue.ref(false), nextColorModeLabel: vue.ref("Use dark mode"), toggleColorMode() {} }) },
    "~/composables/useAuth": {
      useAuth: () => ({
        user: vue.ref(null),
        isReady: vue.ref(true),
        fetchMe: () => Promise.resolve(null),
        logout: () => Promise.resolve(),
      }),
    },
    "~/composables/useRoster": {
      useRoster: () => {
        const days = vue.ref([]);
        const shifts = vue.ref([]);
        const preferences = vue.ref({
          saturdayOff: true,
          sundayOff: true,
          holidaysOff: true,
          defaultShiftCode: "K123",
          allocationPriority: ["PRD", "PHL", "AL"],
        });
        const balances = vue.ref([]);
        const transactions = vue.ref([]);
        const loading = vue.ref(false);
        const saving = vue.ref(false);
        const daysByDate = vue.ref(new Map());
        const shiftsByCode = vue.ref(new Map());
        const summary = vue.ref({
          month: 11,
          year: 2026,
          workingDays: 0,
          workingHours: 0,
          prdUsed: 0,
          prdAllowance: 7,
          prdRemaining: 7,
          phlConfirmed: 0,
          phlPending: 0,
          phlRemaining: 0,
          alConfirmed: 0,
          alPending: 0,
          alRemaining: 0,
          h1Count: 0,
          h2Count: 0,
          pendingRequests: 0,
          unassignedDays: 0,
          totalDays: 30,
        });
        return {
          days,
          shifts,
          preferences,
          balances,
          transactions,
          loading,
          saving,
          error: vue.ref(null),
          isInitialized: vue.ref(true),
          shiftsByCode,
          daysByDate,
          summary,
          loadMonth: () => Promise.resolve(),
          saveDay: () => Promise.resolve(true),
          deleteDay: () => Promise.resolve(true),
          resetMonth: () => Promise.resolve(true),
          savePreferences: () => Promise.resolve(true),
          createShift: () => Promise.resolve(null),
          updateShift: () => Promise.resolve(null),
          recordLeaveAdjustment: () => Promise.resolve(true),
          previewSmartRoster: () => null,
          leaveRestriction: () => null,
          applySmartRoster: () => Promise.resolve(true),
        };
      },
    },
    "~/lib/roster": {
      calculateDayWorkingHours: () => 0,
      getRosterDayColors,
    },
  };
  const globals = {
    ...vue,
    definePageMeta() {},
    useHead: options.inlineTemplate === false ? () => {} : useHead,
    useSeoMeta: options.inlineTemplate === false ? () => {} : useSeoMeta,
    useRoute: () => options.route ?? { params: {}, query: {} },
    useRouter: () => ({ push() {}, replace() {} }),
    useProductDomain: () => ({
      config: { mainOrigin: "https://chlatwork.com" },
      destination: (path: string) => new URL(path, "https://chlatwork.com").href,
    }),
    useState: () => vue.ref({ year: 2026, month: 11, day: 4 }),
    createError: (data: object) => Object.assign(new Error("Not found"), data),
    navigateTo: options.navigateTo ?? (() => {}),
    onMounted() {},
    onBeforeUnmount() {},
  };
  const module = { exports: {} as any };
  new Function("require", "module", "exports", ...Object.keys(globals), code)(
    (name: string) => {
      if (name.startsWith("~/components/roster/"))
        return {
          __esModule: true,
          default: {
            name: name.replace("~/components/roster/", "").replace(".vue", ""),
            setup: () => () => null,
          },
        };
      if (name.startsWith("~/") && name.endsWith(".vue"))
        return {
          __esModule: true,
          default: loadCalendarComponent(name.replace("~/", "app/"), options),
        };
      if (!(name in dependencies))
        throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports.default;
}
