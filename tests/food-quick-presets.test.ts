import assert from "node:assert/strict";
import test from "node:test";
import {
  FOOD_QUICK_PRESETS,
  applyFoodQuickPreset,
  matchesFoodQuickPreset,
} from "../app/lib/food-quick-presets.ts";
import { validFoodFilters } from "../api/src/food/food-filters.ts";

test("all quick presets use real supported filters and retain the requested popular shortcuts", () => {
  assert.ok(FOOD_QUICK_PRESETS.length >= 12);
  for (const preset of FOOD_QUICK_PRESETS)
    assert.equal(validFoodFilters(preset.filters), true, preset.id);
  for (const id of [
    "after-work-drinks",
    "after-work-date",
    "budget-drinks",
    "street-food-chill",
    "solo-lunch",
  ])
    assert.ok(FOOD_QUICK_PRESETS.some((preset) => preset.id === id));
});

test("one-tap presets replace stale discovery choices while preserving location, allergies and accessibility", () => {
  const preset = FOOD_QUICK_PRESETS.find(
    (preset) => preset.id === "solo-lunch",
  )!;
  const previous = {
    filters: {
      who: "couple",
      foodTypes: ["pizza"],
      dietary: ["allergies"],
      foodPreferences: ["no-pork"],
      accessibility: ["wheelchair-access"],
      city: "siem-reap",
      locationDiscovery: "within-3-km",
    },
  };
  const result = applyFoodQuickPreset(previous, preset);
  assert.equal(result.peopleCount, 1);
  assert.equal(result.filters.who, "solo");
  assert.equal(result.filters.city, "siem-reap");
  assert.deepEqual(result.filters.dietary, ["allergies"]);
  assert.deepEqual(result.filters.foodPreferences, ["no-pork"]);
  assert.deepEqual(result.filters.accessibility, ["wheelchair-access"]);
  assert.equal(result.filters.foodTypes, undefined);
  assert.equal(previous.filters.who, "couple");
  assert.equal(matchesFoodQuickPreset(result, preset), true);
  assert.equal(
    matchesFoodQuickPreset({ ...result, peopleCount: 2 }, preset),
    false,
  );
});

test("vegetarian shortcuts add their diet without removing existing allergy constraints and cooking stays Gemini mode", () => {
  const veggie = FOOD_QUICK_PRESETS.find(
    (preset) => preset.id === "vegetarian-lunch",
  )!;
  const result = applyFoodQuickPreset(
    { filters: { dietary: ["allergies"] } },
    veggie,
  );
  assert.deepEqual(result.filters.dietary, ["allergies", "vegetarian"]);
  const cooking = applyFoodQuickPreset(
    { filters: {} },
    FOOD_QUICK_PRESETS.find((preset) => preset.id === "budget-cooking")!,
  );
  assert.equal(cooking.mode, "cook-at-home");
});
