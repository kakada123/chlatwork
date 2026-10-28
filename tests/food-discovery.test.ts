import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as vue from "vue";
import ts from "../api/node_modules/typescript/lib/typescript.js";
import * as maps from "../app/lib/food-maps.ts";

function discovery(fetcher: (...args: any[]) => Promise<unknown>) {
  const source = readFileSync(
    new URL("../app/composables/useFoodDiscovery.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} as any };
  new Function("require", "module", "exports", "$fetch", code)(
    (name: string) => {
      if (name === "vue") return vue;
      if (name === "~/lib/food-maps") return maps;
      throw new Error(`Unexpected Food dependency: ${name}`);
    },
    module,
    module.exports,
    fetcher,
  );
  return module.exports.useFoodDiscovery();
}

test("Food AI picker posts all current criteria and GPS coordinates instead of the old meal-only random request", async () => {
  const calls: any[][] = [];
  const state = discovery(async (...args) => {
    calls.push(args);
    return { type: "place", selectionSource: "gemini", messageKm: "សាកល្បង" };
  });
  state.mode.value = "dine-out";
  state.mealTime.value = "dinner";
  state.occasion.value = "family";
  state.peopleCount.value = 4;
  state.totalBudget.value = 24;
  state.searchKeyword.value = " គុយទាវ ";
  state.userCoords.value = { lat: 11.55, lng: 104.92 };
  await state.fetchRandomPick();
  assert.equal(calls[0][0], "/api/food/pick");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(calls[0][1].body, {
    mode: "dine-out",
    mealTime: "dinner",
    occasion: "family",
    peopleCount: 4,
    totalBudget: 24,
    cuisine: "គុយទាវ",
    limit: 20,
    lat: 11.55,
    lng: 104.92,
  });
  assert.equal(state.randomSuggestion.value.selectionSource, "gemini");
});

test("Food AI picker passes the selected district for recipe mode and stops a duplicate paid request", async () => {
  let finish!: (value: unknown) => void;
  const calls: any[][] = [];
  const state = discovery((...args) => {
    calls.push(args);
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  state.mode.value = "cook-at-home";
  state.selectedDistrictId.value = "tuol-kork";
  const pending = state.fetchRandomPick();
  const duplicate = state.fetchRandomPick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].body.mode, "cook-at-home");
  assert.equal(calls[0][1].body.district, "tuol-kork");
  finish({ type: "dish", messageKm: "ម្ហូប" });
  await Promise.all([pending, duplicate]);
  assert.equal(state.isRandomLoading.value, false);
});

test("Food AI failure clears the previous pick and shows an error without fabricating a recipe", async () => {
  const state = discovery(async () => {
    throw new Error("Provider unavailable");
  });
  state.randomSuggestion.value = { type: "dish", messageKm: "Old choice" };
  await state.fetchRandomPick();
  assert.equal(state.randomSuggestion.value, null);
  assert.ok(state.errorMessage.value);
  assert.equal(state.isRandomLoading.value, false);
});
