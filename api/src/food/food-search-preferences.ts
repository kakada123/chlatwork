import { BadRequestException } from "@nestjs/common";
import type { FoodRecommendationDto } from "./dto/food-recommendation.dto";
import { describeFoodFilters } from "./food-filters";
import type { MealTime, Occasion } from "./food.types";

export function resolvedFoodCriteria(dto: FoodRecommendationDto) {
  const selected = describeFoodFilters(dto.filters);
  const who = String(dto.filters?.who || "");
  const occasion: Occasion = !who
    ? dto.occasion || "friends"
    : who.startsWith("solo")
      ? "solo"
      : who.includes("first-date")
        ? "first-date"
        : who.includes("couple")
          ? "couple"
          : who.includes("grandparent")
            ? "elderly"
            : /parent|family|relative|sibling/.test(who)
              ? "family"
              : "friends";
  const window = String(dto.filters?.mealWindow || "");
  const mealTime: MealTime = !window
    ? dto.mealTime || "lunch"
    : window.includes("breakfast")
      ? "breakfast"
      : /snack|tea/.test(window)
        ? "snack"
        : /dinner|night|midnight/.test(window)
          ? "dinner"
          : window.includes("anytime")
            ? "any"
            : "lunch";
  const peopleCount = dto.peopleCount || 1;
  let totalBudget = dto.totalBudget;
  const range = String(dto.filters?.budgetRange || "");
  const cap = range.startsWith("ultra-budget")
    ? 1.99
    : range.startsWith("student-budget")
      ? 5
      : range.startsWith("affordable")
        ? 10
        : range.startsWith("moderate")
          ? 20
          : range.startsWith("comfortable")
            ? 35
            : range.startsWith("premium")
              ? 50
              : range.startsWith("luxury")
                ? 100
                : undefined;
  // Ranges replace the numeric input; an open-ended range does not imply a spending ceiling.
  if (
    dto.filters?.budgetType === "flexible-no-fixed-budget" ||
    range.startsWith("fine-dining")
  )
    totalBudget = undefined;
  else if (cap !== undefined) totalBudget = cap * peopleCount;
  else if (
    dto.filters?.budgetType === "per-person" &&
    totalBudget !== undefined
  )
    totalBudget *= peopleCount;
  if (totalBudget !== undefined && totalBudget > 10000)
    throw new BadRequestException(
      "The total group budget must not exceed $10,000.",
    );
  if (selected.dietary?.includes("Allergies") && !dto.allergies?.trim())
    throw new BadRequestException("Specify the allergies to avoid.");
  return {
    mealTime,
    occasion,
    peopleCount,
    totalBudget,
    preferences: selected,
  };
}

export function discoveryRadius(
  dto: { filters?: FoodRecommendationDto["filters"] },
  fallback: number,
): number {
  const location = dto.filters?.locationDiscovery;
  return location === "within-1-km"
    ? 1000
    : location === "within-3-km"
      ? 3000
      : location === "within-5-km"
        ? 5000
        : location === "within-10-km"
          ? 10000
          : location === "anywhere-in-city"
            ? 50000
            : fallback;
}

export function searchLocationLabel(options: {
  filters?: FoodRecommendationDto["filters"];
  locationQuery?: string;
}): string | undefined {
  const selected = describeFoodFilters(options.filters);
  const discovery = options.filters?.locationDiscovery;
  if (discovery === "near-me") return undefined;
  const needsAddress =
    discovery === "near-home" ||
    discovery === "near-workplace" ||
    discovery === "near-university" ||
    options.filters?.city === "other-cambodian-provinces";
  if (needsAddress && !options.locationQuery?.trim())
    throw new BadRequestException(
      "Enter the address, landmark or province for this location filter.",
    );
  const city = selected.city?.[0];
  const area = !city || city === "Phnom Penh" ? selected.area?.[0] : undefined;
  const landmark =
    discovery === "near-cinema"
      ? "cinema"
      : discovery === "near-shopping-mall"
        ? "shopping mall"
        : discovery === "near-tourist-attraction"
          ? "tourist attraction"
          : undefined;
  const parts = [
    options.locationQuery?.trim() || landmark,
    area,
    city === "Other Cambodian Provinces"
      ? undefined
      : city || (area ? "Phnom Penh" : undefined),
  ].filter(Boolean);
  return parts.length ? [...parts, "Cambodia"].join(", ") : undefined;
}

export function foodSearchQuery(
  cuisine: string | undefined,
  filters: FoodRecommendationDto["filters"],
): string {
  const selected = describeFoodFilters(filters);
  // Google text matching expresses preferences; only returned/provider-supported facts may become guarantees.
  const meal = selected.mealWindow?.[0]?.split("(")[0].split("/")[0].trim();
  const budget = selected.budgetRange?.[0]?.split(" — ")[0];
  const parts = [
    // Generic preferences such as "Affordable" must still search for food businesses.
    !cuisine?.trim() ? "restaurants cafes food places" : undefined,
    cuisine?.trim(),
    meal,
    budget,
    ...[
      "foodTypes",
      "cuisines",
      "restaurantTypes",
      "who",
      "eventOccasion",
      "vibes",
      "budgetPreferences",
      "dietary",
      "spiceLevel",
      "accessibility",
      "facilities",
      "operatingStatus",
      "services",
      "waitingTime",
      "weather",
      "payments",
      "foodPreferences",
      "reviews",
    ].flatMap((key) => selected[key] || []),
  ].filter((value): value is string =>
    Boolean(value && value.toLowerCase() !== "all"),
  );
  const query =
    [...new Set(parts)].join(" ") || "restaurants cafes food places";
  if (query.length > 2000)
    throw new BadRequestException(
      "Too many search preferences; select fewer filters.",
    );
  return query;
}
