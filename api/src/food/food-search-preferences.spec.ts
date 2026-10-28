import {
  resolvedFoodCriteria,
  discoveryRadius,
  searchLocationLabel,
  foodSearchQuery,
} from "./food-search-preferences";

describe("Food search criteria", () => {
  it("normalizes per-person input and per-person ranges into group totals", () => {
    expect(
      resolvedFoodCriteria({
        peopleCount: 4,
        totalBudget: 10,
        filters: { budgetType: "per-person" },
      }).totalBudget,
    ).toBe(40);
    expect(
      resolvedFoodCriteria({
        peopleCount: 4,
        totalBudget: 1,
        filters: { budgetRange: "affordable-5-10" },
      }).totalBudget,
    ).toBe(40);
    expect(
      resolvedFoodCriteria({
        peopleCount: 4,
        totalBudget: 10,
        filters: { budgetRange: "fine-dining-100" },
      }).totalBudget,
    ).toBeUndefined();
    expect(
      resolvedFoodCriteria({
        totalBudget: 10,
        filters: { budgetType: "flexible-no-fixed-budget" },
      }).totalBudget,
    ).toBeUndefined();
  });

  it("rejects excessive normalized budgets and missing allergy details", () => {
    expect(() =>
      resolvedFoodCriteria({
        peopleCount: 50,
        totalBudget: 10000,
        filters: { budgetType: "per-person" },
      }),
    ).toThrow();
    expect(() =>
      resolvedFoodCriteria({ filters: { dietary: ["allergies"] } }),
    ).toThrow();
    expect(
      resolvedFoodCriteria({
        allergies: "peanuts",
        filters: { dietary: ["allergies"] },
      }),
    ).toBeDefined();
  });

  it("maps discovery windows without treating them as opening hours", () => {
    expect(
      resolvedFoodCriteria({
        filters: {
          who: "parents-with-kids",
          mealWindow: "midnight-food-12-3-am",
        },
      }),
    ).toMatchObject({ occasion: "family", mealTime: "dinner" });
    expect(
      discoveryRadius({ filters: { locationDiscovery: "within-3-km" } }, 1000),
    ).toBe(3000);
    expect(foodSearchQuery(undefined, { budgetRange: "affordable-5-10" })).toBe(
      "restaurants cafes food places Affordable",
    );
    expect(foodSearchQuery(undefined, { who: "family" })).toBe(
      "restaurants cafes food places Family",
    );
  });

  it("prioritizes a selected city over a stale Phnom Penh area and requires private landmarks", () => {
    expect(
      searchLocationLabel({
        filters: { city: "siem-reap", area: "toul-kork" },
      }),
    ).toBe("Siem Reap, Cambodia");
    expect(searchLocationLabel({ filters: { area: "toul-kork" } })).toBe(
      "Toul Kork, Phnom Penh, Cambodia",
    );
    expect(searchLocationLabel({})).toBeUndefined();
    expect(
      searchLocationLabel({
        filters: { locationDiscovery: "near-me", city: "siem-reap" },
      }),
    ).toBeUndefined();
    expect(() =>
      searchLocationLabel({ filters: { locationDiscovery: "near-home" } }),
    ).toThrow();
  });
});
