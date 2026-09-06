import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { compileScript, parse } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as display from "../app/lib/creator-credit-display.ts";

const account = {
  id: "target-user",
  name: "Test",
  email: null,
  balance: 20,
  hasWallet: true,
};

// Exercise the real page's setup and lifecycle without a browser or Nuxt server.
// Compilation preserves its handlers; only network and framework globals are stubbed.
function pageHarness(
  path: string,
  serviceOverrides: Record<string, unknown> = {},
) {
  const session = vue.ref<any>({ id: "admin-user", role: "ADMIN" });
  const balance = vue.ref<number | null>(null);
  const mounted: (() => void)[] = [];
  const unmounted: (() => void)[] = [];
  const stops: (() => void)[] = [];
  const services = {
    getCreatorCreditAccounts: async () => ({
      items: [account],
      total: 1,
      page: 1,
      pageSize: 20,
    }),
    getCreatorCreditAccount: async () => ({
      user: { ...account },
      transactions: [],
    }),
    ...serviceOverrides,
  };
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    computed: vue.computed,
    watch: (...args: any[]) => {
      const stop = (vue.watch as any)(...args);
      stops.push(stop);
      return stop;
    },
    onMounted: (fn: () => void) => mounted.push(fn),
    onBeforeUnmount: (fn: () => void) => unmounted.push(fn),
    useAuth: () => ({
      user: session,
      isReady: vue.ref(true),
      fetchMe: async () => {},
    }),
    useState: () => balance,
    definePageMeta: () => {},
    useSeoMeta: () => {},
  };
  const filename = new URL(`../${path}`, import.meta.url);
  const { descriptor } = parse(readFileSync(filename, "utf8"), {
    filename: filename.pathname,
  });
  const script = compileScript(descriptor, { id: "credit-page-test" });
  const compiled = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  const requireMock = (name: string) => {
    if (name === "vue") return vue;
    if (name === "~/services/creator-ai.service") return services;
    if (name === "~/lib/creator-credit-display") return display;
    if (name === "lucide-vue-next") return {};
    throw new Error(`Unexpected dependency ${name}`);
  };
  new Function(
    "require",
    "module",
    "exports",
    ...Object.keys(globals),
    compiled,
  )(requireMock, module, module.exports, ...Object.values(globals));
  const state = module.exports.default.setup({}, { expose() {} });
  mounted.forEach((fn) => fn());
  return {
    state,
    session,
    balance,
    dispose() {
      unmounted.forEach((fn) => fn());
      stops.forEach((fn) => fn());
    },
  };
}

test("admin review does not save until confirmation and retries the immutable intent after a lost response", async () => {
  const requests: any[] = [];
  const testPage = pageHarness("app/pages/creator/admin/credits.vue", {
    adjustCreatorCredits: async (input: unknown, key: string) => {
      requests.push({ input, key });
      if (requests.length === 1) throw new Error("Response lost");
      return { transactionId: "saved-once", balance: 25 };
    },
  });
  try {
    const state = testPage.state;
    await state.selectAccount(account.id);
    state.amount.value = 5;
    state.reason.value = "Support grant";
    state.startReview();
    assert.equal(requests.length, 0);
    assert.equal(state.locked.value, true);
    // Even changed form refs cannot alter an already reviewed financial intent.
    state.amount.value = 100;
    state.reason.value = "Changed after review";
    await state.confirmAdjustment();
    assert.equal(state.attempted.value, true);
    assert.ok(state.review.value);
    await state.confirmAdjustment();
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], requests[1]);
    assert.equal(requests[0].input.amount, 5);
    assert.equal(requests[0].input.reason, "Support grant");
    assert.equal(state.review.value, null);
    assert.match(state.successMessage.value, /Saved \+5/);
  } finally {
    testPage.dispose();
  }
});

test("a stale admin balance requires a fresh review and does not retry automatically", async () => {
  let calls = 0;
  const testPage = pageHarness("app/pages/creator/admin/credits.vue", {
    adjustCreatorCredits: async () => {
      calls++;
      throw {
        statusCode: 409,
        data: { code: "CREDIT_BALANCE_CHANGED", message: "Balance changed" },
      };
    },
  });
  try {
    const state = testPage.state;
    await state.selectAccount(account.id);
    state.amount.value = 5;
    state.reason.value = "Support grant";
    state.startReview();
    await state.confirmAdjustment();
    assert.equal(calls, 1);
    assert.equal(state.review.value, null);
    assert.equal(state.amount.value, "");
    assert.equal(state.errorMessage.value, "Balance changed");
  } finally {
    testPage.dispose();
  }
});

test("admin account data and review are cleared on loss of admin access", async () => {
  const testPage = pageHarness("app/pages/creator/admin/credits.vue");
  try {
    await testPage.state.selectAccount(account.id);
    testPage.session.value = { id: "admin-user", role: "USER" };
    await vue.nextTick();
    assert.equal(testPage.state.accounts.value, null);
    assert.equal(testPage.state.details.value, null);
    assert.equal(testPage.state.review.value, null);
  } finally {
    testPage.dispose();
  }
});

test("a personal credit response cannot restore private history after signing out", async () => {
  let resolve!: (value: unknown) => void;
  const pending = new Promise((done) => {
    resolve = done;
  });
  const testPage = pageHarness("app/pages/creator/credits.vue", {
    getCreatorCreditOverview: () => pending,
  });
  try {
    testPage.session.value = null;
    await vue.nextTick();
    resolve({ balance: 99, transactions: [{ id: "private" }] });
    await pending;
    await vue.nextTick();
    assert.equal(testPage.state.overview.value, null);
    assert.equal(testPage.balance.value, null);
    assert.equal(testPage.state.loading.value, false);
  } finally {
    testPage.dispose();
  }
});

test("credit activity distinguishes a zero-amount finalization from another deduction", () => {
  assert.equal(display.formatCreditChange(0), "No balance change");
  assert.equal(display.formatCreditChange(-5), "−5");
  assert.equal(display.formatCreditChange(20), "+20");
  assert.equal(
    display.creatorTransactionLabel("CHARGE"),
    "Generation completed",
  );
  assert.equal(display.creatorFeatureRoute("POST"), "/creator/create/post");
});
