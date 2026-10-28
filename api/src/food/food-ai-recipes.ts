import { createHash } from "node:crypto";
import type { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import type { KhmerRecipe } from "./food.types";

const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
const OCCASIONS = ["solo", "friends", "first-date", "couple", "family", "elderly"] as const;
const CATEGORIES = ["soup", "stir-fry", "curry", "rice", "noodle", "salad", "dessert"] as const;

export function normalizedRecipeName(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\p{S}\s\u200b-\u200d]+/gu, "");
}

const stringSchema = { type: "string" };
function objectSchema(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, required, properties };
}

export function recipeResponseSchema(count: number) {
  return objectSchema({ recipes: { type: "array", minItems: 1, maxItems: count, items: objectSchema({
    nameKm: stringSchema, nameEn: stringSchema, descriptionKm: stringSchema, descriptionEn: stringSchema,
    recommendationKm: stringSchema,
    mealTimes: { type: "array", items: { type: "string", enum: MEALS } },
    occasions: { type: "array", items: { type: "string", enum: OCCASIONS } },
    prepTimeMinutes: { type: "integer" }, cookTimeMinutes: { type: "integer" }, servings: { type: "integer" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] }, estimatedCostUsd: { type: "number" },
    category: { type: "string", enum: CATEGORIES },
    ingredients: { type: "array", minItems: 1, maxItems: 20, items: objectSchema({ nameKm: stringSchema, nameEn: stringSchema, amount: stringSchema }) },
    steps: { type: "array", minItems: 2, maxItems: 12, items: objectSchema({ textKm: stringSchema, textEn: stringSchema }) },
  }) } });
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid recipe object");
  return value as Record<string, unknown>;
}

function text(value: unknown, maximum: number, khmer = false): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum ||
      /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) || (khmer && !/[\u1780-\u17ff]/.test(value))) throw new Error("Invalid recipe text");
  return value.trim();
}

function number(value: unknown, minimum: number, maximum: number, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) throw new Error("Invalid recipe number");
  return value;
}

function list<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || !value.length || value.length > allowed.length || value.some((entry) => !allowed.includes(entry))) throw new Error("Invalid recipe list");
  return [...new Set(value)] as T[];
}

function array(value: unknown, minimum: number, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) throw new Error("Invalid recipe items");
  return value;
}

export function parseGeneratedRecipes(value: unknown, criteria: FoodRecommendationDto, count: number): KhmerRecipe[] {
  const rawRecipes = array(object(value).recipes, 1, count);
  const excluded = new Set((criteria.recentRecipeNames || []).map(normalizedRecipeName));
  const accepted: KhmerRecipe[] = [];
  for (const value of rawRecipes) {
    const raw = object(value);
    const nameKm = text(raw.nameKm, 160, true);
    const nameEn = text(raw.nameEn, 160);
    const names = [normalizedRecipeName(nameKm), normalizedRecipeName(nameEn)];
    const mealTimes = list(raw.mealTimes, MEALS);
    const occasions = list(raw.occasions, OCCASIONS);
    if (criteria.mealTime && criteria.mealTime !== "any" && !mealTimes.some((meal) => meal === criteria.mealTime)) throw new Error("Recipe meal mismatch");
    if (criteria.occasion && criteria.occasion !== "any" && !occasions.some((occasion) => occasion === criteria.occasion)) throw new Error("Recipe occasion mismatch");
    const servings = number(raw.servings, 1, 50, true);
    if (servings !== (criteria.peopleCount || 1)) throw new Error("Recipe serving mismatch");
    const estimatedCostUsd = number(raw.estimatedCostUsd, 0.01, 10000);
    if (criteria.totalBudget && estimatedCostUsd > criteria.totalBudget) throw new Error("Recipe exceeds budget");
    const recipe: KhmerRecipe = {
      id: `gemini-${createHash("sha256").update(names.join(":" )).digest("hex").slice(0, 24)}`,
      nameKm, nameEn, source: "gemini", recommendationKm: text(raw.recommendationKm, 500, true),
      descriptionKm: text(raw.descriptionKm, 800, true), descriptionEn: text(raw.descriptionEn, 800),
      mealTimes, occasions, prepTimeMinutes: number(raw.prepTimeMinutes, 0, 240, true),
      cookTimeMinutes: number(raw.cookTimeMinutes, 0, 480, true), servings, estimatedCostUsd,
      difficulty: list([raw.difficulty], ["easy", "medium", "hard"] as const)[0],
      category: list([raw.category], CATEGORIES)[0],
      ingredients: array(raw.ingredients, 1, 20).map((value) => {
        const ingredient = object(value);
        return { nameKm: text(ingredient.nameKm, 160, true), nameEn: text(ingredient.nameEn, 160), amount: text(ingredient.amount, 160) };
      }),
      steps: array(raw.steps, 2, 12).map((value, index) => {
        const step = object(value);
        return { step: index + 1, textKm: text(step.textKm, 1000, true), textEn: text(step.textEn, 1000) };
      }),
    };
    if (recipe.prepTimeMinutes + recipe.cookTimeMinutes <= 0) throw new Error("Invalid recipe duration");
    // Compare both languages and normalized names; a different ID or punctuation cannot recycle a recent dish.
    if (names.some((name) => !name || excluded.has(name))) continue;
    accepted.push(recipe);
    names.forEach((name) => excluded.add(name));
  }
  if (!accepted.length) throw new Error("No fresh recipe suggestions");
  return accepted;
}
