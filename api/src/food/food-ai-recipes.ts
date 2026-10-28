import { createHash } from "node:crypto";
import type { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import type { KhmerRecipe } from "./food.types";

const MEALS = ["breakfast", "lunch", "snack", "dinner"] as const;
const OCCASIONS = [
  "solo",
  "friends",
  "first-date",
  "couple",
  "family",
  "elderly",
] as const;
const CATEGORIES = [
  "soup",
  "stir-fry",
  "curry",
  "rice",
  "noodle",
  "salad",
  "dessert",
] as const;

type RecipeValidationReason =
  | "INVALID_STRUCTURE"
  | "INVALID_TEXT"
  | "INVALID_NUMBER"
  | "INVALID_METADATA"
  | "MEAL_MISMATCH"
  | "OCCASION_MISMATCH"
  | "SERVINGS_MISMATCH"
  | "OVER_BUDGET"
  | "INVALID_DURATION"
  | "REPEATED_ONLY";
type RecipeField =
  | "recipes"
  | "nameKm"
  | "nameEn"
  | "mealTimes"
  | "occasions"
  | "servings"
  | "estimatedCostUsd"
  | "recommendationKm"
  | "descriptionKm"
  | "descriptionEn"
  | "prepTimeMinutes"
  | "cookTimeMinutes"
  | "difficulty"
  | "category"
  | "ingredients"
  | "ingredients.nameKm"
  | "ingredients.nameEn"
  | "ingredients.amount"
  | "steps"
  | "steps.textKm"
  | "steps.textEn";

export class FoodRecipeValidationError extends Error {
  constructor(
    readonly reason: RecipeValidationReason,
    readonly field: RecipeField,
  ) {
    super(reason);
  }
}

export function normalizedRecipeName(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\p{S}\s\u200b-\u200d]+/gu, "");
}

const stringSchema = { type: "string" };
function objectSchema(
  properties: Record<string, unknown>,
  required = Object.keys(properties),
) {
  return { type: "object", additionalProperties: false, required, properties };
}

export function recipeResponseSchema(count: number) {
  return objectSchema({
    recipes: {
      type: "array",
      minItems: 1,
      maxItems: count,
      items: objectSchema({
        nameKm: stringSchema,
        nameEn: stringSchema,
        descriptionKm: stringSchema,
        descriptionEn: stringSchema,
        recommendationKm: stringSchema,
        mealTimes: { type: "array", items: { type: "string", enum: MEALS } },
        occasions: {
          type: "array",
          items: { type: "string", enum: OCCASIONS },
        },
        prepTimeMinutes: { type: "integer" },
        cookTimeMinutes: { type: "integer" },
        servings: { type: "integer" },
        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        estimatedCostUsd: { type: "number" },
        category: { type: "string", enum: CATEGORIES },
        ingredients: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: objectSchema({
            nameKm: stringSchema,
            nameEn: stringSchema,
            amount: stringSchema,
          }),
        },
        steps: {
          type: "array",
          minItems: 2,
          maxItems: 12,
          items: objectSchema({ textKm: stringSchema, textEn: stringSchema }),
        },
      }),
    },
  });
}

function object(
  value: unknown,
  field: RecipeField = "recipes",
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new FoodRecipeValidationError("INVALID_STRUCTURE", field);
  return value as Record<string, unknown>;
}

function text(
  value: unknown,
  maximum: number,
  khmer = false,
  field: RecipeField = "recipes",
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maximum ||
    /[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ||
    (khmer && !/[\u1780-\u17ff]/.test(value))
  )
    throw new FoodRecipeValidationError("INVALID_TEXT", field);
  return value.trim();
}

function number(
  value: unknown,
  minimum: number,
  maximum: number,
  integer = false,
  field: RecipeField = "recipes",
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  )
    throw new FoodRecipeValidationError("INVALID_NUMBER", field);
  return value;
}

function list<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: RecipeField,
): T[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > allowed.length ||
    value.some((entry) => !allowed.includes(entry))
  )
    throw new FoodRecipeValidationError("INVALID_METADATA", field);
  return [...new Set(value)] as T[];
}

function array(
  value: unknown,
  minimum: number,
  maximum: number,
  field: RecipeField = "recipes",
): unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum)
    throw new FoodRecipeValidationError("INVALID_STRUCTURE", field);
  return value;
}

export function parseGeneratedRecipes(
  value: unknown,
  criteria: FoodRecommendationDto,
  count: number,
): KhmerRecipe[] {
  const rawRecipes = array(object(value).recipes, 1, count);
  const excluded = new Set(
    (criteria.recentRecipeNames || []).map(normalizedRecipeName),
  );
  const accepted: KhmerRecipe[] = [];
  for (const value of rawRecipes) {
    const raw = object(value);
    const nameKm = text(raw.nameKm, 160, true, "nameKm");
    const nameEn = text(raw.nameEn, 160, false, "nameEn");
    const names = [normalizedRecipeName(nameKm), normalizedRecipeName(nameEn)];
    const mealTimes = list(raw.mealTimes, MEALS, "mealTimes");
    const occasions = list(raw.occasions, OCCASIONS, "occasions");
    if (
      criteria.mealTime &&
      criteria.mealTime !== "any" &&
      !mealTimes.some((meal) => meal === criteria.mealTime)
    )
      throw new FoodRecipeValidationError("MEAL_MISMATCH", "mealTimes");
    if (
      criteria.occasion &&
      criteria.occasion !== "any" &&
      !occasions.some((occasion) => occasion === criteria.occasion)
    )
      throw new FoodRecipeValidationError("OCCASION_MISMATCH", "occasions");
    const servings = number(raw.servings, 1, 50, true, "servings");
    if (servings !== (criteria.peopleCount || 1))
      throw new FoodRecipeValidationError("SERVINGS_MISMATCH", "servings");
    const estimatedCostUsd = number(
      raw.estimatedCostUsd,
      0.01,
      10000,
      false,
      "estimatedCostUsd",
    );
    if (criteria.totalBudget && estimatedCostUsd > criteria.totalBudget)
      throw new FoodRecipeValidationError("OVER_BUDGET", "estimatedCostUsd");
    const recipe: KhmerRecipe = {
      id: `gemini-${createHash("sha256").update(names.join(":")).digest("hex").slice(0, 24)}`,
      nameKm,
      nameEn,
      source: "gemini",
      recommendationKm: text(
        raw.recommendationKm,
        500,
        true,
        "recommendationKm",
      ),
      descriptionKm: text(raw.descriptionKm, 800, true, "descriptionKm"),
      descriptionEn: text(raw.descriptionEn, 800, false, "descriptionEn"),
      mealTimes,
      occasions,
      prepTimeMinutes: number(
        raw.prepTimeMinutes,
        0,
        240,
        true,
        "prepTimeMinutes",
      ),
      cookTimeMinutes: number(
        raw.cookTimeMinutes,
        0,
        480,
        true,
        "cookTimeMinutes",
      ),
      servings,
      estimatedCostUsd,
      difficulty: list(
        [raw.difficulty],
        ["easy", "medium", "hard"] as const,
        "difficulty",
      )[0],
      category: list([raw.category], CATEGORIES, "category")[0],
      ingredients: array(raw.ingredients, 1, 20, "ingredients").map((value) => {
        const ingredient = object(value, "ingredients");
        return {
          nameKm: text(ingredient.nameKm, 160, true, "ingredients.nameKm"),
          nameEn: text(ingredient.nameEn, 160, false, "ingredients.nameEn"),
          amount: text(ingredient.amount, 160, false, "ingredients.amount"),
        };
      }),
      steps: array(raw.steps, 2, 12, "steps").map((value, index) => {
        const step = object(value, "steps");
        return {
          step: index + 1,
          textKm: text(step.textKm, 1000, true, "steps.textKm"),
          textEn: text(step.textEn, 1000, false, "steps.textEn"),
        };
      }),
    };
    if (recipe.prepTimeMinutes + recipe.cookTimeMinutes <= 0)
      throw new FoodRecipeValidationError(
        "INVALID_DURATION",
        "cookTimeMinutes",
      );
    // Compare both languages and normalized names; a different ID or punctuation cannot recycle a recent dish.
    if (names.some((name) => !name || excluded.has(name))) continue;
    accepted.push(recipe);
    names.forEach((name) => excluded.add(name));
  }
  if (!accepted.length)
    throw new FoodRecipeValidationError("REPEATED_ONLY", "recipes");
  return accepted;
}
