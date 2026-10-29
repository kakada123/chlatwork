import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import { parse, compileScript } from "@vue/compiler-sfc";
import ts from "../api/node_modules/typescript/lib/typescript.js";

function mobile() {
  const filename = new URL(
    "../app/components/food/FoodMobileDiscovery.vue",
    import.meta.url,
  ).pathname;
  const { descriptor } = parse(readFileSync(filename, "utf8"), { filename });
  const code = ts.transpileModule(
    compileScript(descriptor, { id: "mobile-food" }).content,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "lucide-vue-next") return new Proxy({}, { get: () => ({}) });
      throw new Error(`Unexpected mobile dependency: ${name}`);
    },
    module,
    module.exports,
  );
  const props = vue.reactive({
    panel: "steps",
    disabled: false,
    locating: false,
    keyword: "",
    mode: "dine-out",
    mealTime: "lunch",
    peopleCount: 3,
    totalBudget: 10,
    filters: {} as Record<string, string | string[]>,
    hasCoords: false,
    locationLabel: "BKK",
    districtId: "bkk",
    districts: [],
  });
  const events: Array<[string, any]> = [];
  const scope = vue.effectScope();
  const state = scope.run(() =>
    module.exports.default.setup(props, {
      expose() {},
      emit(event: string, value: unknown) {
        events.push([event, value]);
        if (event === "change") Object.assign(props, value);
        if (event === "update:panel") props.panel = String(value);
      },
    }),
  );
  return { props, state, events, stop: () => scope.stop() };
}

test("mobile discovery collects five steps and submits only the final action", async () => {
  const { state, events, stop } = mobile();
  try {
    state.chooseFood("បាយសាច់ជ្រូក");
    for (let step = 0; step < 4; step++) {
      assert.equal(state.step.value, step);
      state.next();
      await vue.nextTick();
      assert.equal(
        events.some(([event]) => event === "submit"),
        false,
      );
    }
    state.next();
    assert.equal(events.filter(([event]) => event === "submit").length, 1);
    await state.goStep(1);
    assert.equal(state.step.value, 1);
    state.open("search");
    assert.equal(events.at(-1)?.[0], "update:panel");
    assert.equal(events.filter(([event]) => event === "submit").length, 1);
  } finally {
    stop();
  }
});

test("food and meal choices preserve dietary rules while removing conflicting discovery filters", () => {
  const { props, state, stop } = mobile();
  try {
    props.filters = {
      foodTypes: ["beer"],
      cuisines: ["korean"],
      restaurantTypes: ["pub-and-restaurant"],
      mealWindow: "dinner-7-10-pm",
      dietary: ["allergies"],
      foodPreferences: ["no-pork"],
      area: "bkk1-bkk2-bkk3",
    };
    state.chooseFood("គុយទាវ");
    assert.equal(props.keyword, "គុយទាវ");
    assert.equal(props.filters.foodTypes, undefined);
    assert.equal(props.filters.restaurantTypes, undefined);
    assert.equal(props.filters.cuisines, undefined);
    state.chooseMeal("breakfast");
    assert.equal(props.mealTime, "breakfast");
    assert.equal(props.filters.mealWindow, undefined);
    assert.deepEqual(props.filters.dietary, ["allergies"]);
    assert.deepEqual(props.filters.foodPreferences, ["no-pork"]);
    assert.equal(props.filters.area, "bkk1-bkk2-bkk3");
  } finally {
    stop();
  }
});

test("mobile budget choices keep a clear group/person basis and remove an older preset range", () => {
  const { props, state, stop } = mobile();
  try {
    props.filters = {
      budgetRange: "student-budget-2-5",
      budgetType: "per-person",
      dietary: ["vegan"],
    };
    state.chooseBudget(10);
    assert.equal(props.totalBudget, 10);
    assert.equal(props.filters.budgetType, "per-person");
    assert.equal(props.filters.budgetRange, undefined);
    state.budgetBasis("total-group-budget");
    state.chooseBudget(20);
    assert.equal(props.totalBudget, 20);
    assert.equal(props.filters.budgetType, "total-group-budget");
    state.chooseBudget(null);
    assert.equal(props.filters.budgetType, "flexible-no-fixed-budget");
    assert.deepEqual(props.filters.dietary, ["vegan"]);
  } finally {
    stop();
  }
});

test("mobile discovery blocks invalid values and pending GPS submission without blocking earlier steps", async () => {
  const { props, state, events, stop } = mobile();
  try {
    props.locating = true;
    state.next();
    assert.equal(state.step.value, 1);
    await state.goStep(4);
    state.next();
    assert.equal(
      events.some(([event]) => event === "submit"),
      false,
    );
    props.locating = false;
    props.peopleCount = 0;
    state.next();
    assert.equal(
      events.some(([event]) => event === "submit"),
      false,
    );
    props.peopleCount = 51;
    assert.equal(state.valid.value, false);
    props.peopleCount = 4;
    props.totalBudget = Number.NaN;
    assert.equal(state.valid.value, false);
    props.totalBudget = 10;
    props.disabled = true;
    state.next();
    state.chooseFood("new");
    assert.equal(props.keyword, "");
    assert.equal(
      events.some(([event]) => event === "submit"),
      false,
    );
    props.disabled = false;
    state.next();
    assert.equal(events.filter(([event]) => event === "submit").length, 1);
  } finally {
    stop();
  }
});
