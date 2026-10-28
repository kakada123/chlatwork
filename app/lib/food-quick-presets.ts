export interface FoodQuickPreset {
  id: string;
  icon: string;
  labelKm: string;
  labelEn: string;
  peopleCount: number;
  totalBudget: number;
  mode: "dine-out" | "cook-at-home";
  filters: Record<string, string | string[]>;
}
export interface FoodQuickCriteria {
  filters: Record<string, string | string[]>;
  peopleCount?: number;
  totalBudget?: number;
  mode?: "dine-out" | "cook-at-home";
  keyword?: string;
}
const keep = new Set([
  "locationDiscovery",
  "area",
  "city",
  "dietary",
  "foodPreferences",
  "accessibility",
]);
function preset(
  id: string,
  icon: string,
  labelKm: string,
  labelEn: string,
  peopleCount: number,
  cap: number,
  filters: FoodQuickPreset["filters"],
  mode: FoodQuickPreset["mode"] = "dine-out",
): FoodQuickPreset {
  return {
    id,
    icon,
    labelKm,
    labelEn,
    peopleCount,
    totalBudget: peopleCount * cap,
    mode,
    filters: { budgetType: "total-group-budget", ...filters },
  };
}

// Curated shortcuts select filters only; all places and recipes still come from Google/Gemini.
export const FOOD_QUICK_PRESETS: FoodQuickPreset[] = [
  preset(
    "after-work-drinks",
    "🍻",
    "ចេញពីធ្វើការ ផឹកអី?",
    "After-work drinks",
    3,
    10,
    {
      who: "coworkers",
      eventOccasion: "after-work",
      mealWindow: "early-dinner-5-7-pm",
      budgetRange: "affordable-5-10",
      foodTypes: ["beer"],
      restaurantTypes: ["pub-and-restaurant"],
      vibes: ["lively", "group-friendly"],
    },
  ),
  preset(
    "after-work-date",
    "🌇",
    "ចេញពីធ្វើការ ណាត់ជួប",
    "After-work date",
    2,
    20,
    {
      who: "couple",
      eventOccasion: "casual-date",
      mealWindow: "early-dinner-5-7-pm",
      budgetRange: "moderate-10-20",
      restaurantTypes: ["casual-restaurant"],
      vibes: ["cozy", "romantic"],
    },
  ),
  preset("budget-drinks", "🥂", "ផឹកអី ថវិកាតិច", "Drinks on a budget", 3, 5, {
    who: "friends",
    eventOccasion: "drinking-and-food",
    budgetRange: "student-budget-2-5",
    foodTypes: ["beer"],
    restaurantTypes: ["pub-and-restaurant"],
    budgetPreferences: ["happy-hour-offers", "best-value-for-money"],
  }),
  preset(
    "street-food-chill",
    "🍢",
    "ម្ហូបតាមផ្លូវ អង្គុយលេង",
    "Street food & drinks",
    3,
    5,
    {
      who: "friends",
      eventOccasion: "friends-hangout",
      budgetRange: "student-budget-2-5",
      foodTypes: ["skewers", "beer"],
      restaurantTypes: ["street-food-stall"],
      vibes: ["outdoor-breeze", "group-friendly"],
    },
  ),
  preset("solo-lunch", "🍚", "បាយថ្ងៃត្រង់ ម្នាក់ឯង", "Easy solo lunch", 1, 5, {
    who: "solo",
    eventOccasion: "quick-meal",
    mealWindow: "lunch-11-am-2-pm",
    budgetRange: "student-budget-2-5",
    restaurantTypes: ["local-restaurant"],
  }),
  preset(
    "student-lunch",
    "🎒",
    "អាហារនិស្សិត សន្សំលុយ",
    "Student budget",
    2,
    5,
    {
      who: "university-students",
      eventOccasion: "after-school-university",
      budgetRange: "student-budget-2-5",
      restaurantTypes: ["local-restaurant"],
      budgetPreferences: ["best-value-for-money"],
    },
  ),
  preset(
    "office-lunch",
    "💼",
    "បាយថ្ងៃត្រង់ ជាមួយក្រុម",
    "Office team lunch",
    4,
    10,
    {
      who: "office-team",
      eventOccasion: "team-lunch",
      mealWindow: "lunch-11-am-2-pm",
      budgetRange: "affordable-5-10",
      restaurantTypes: ["casual-restaurant"],
      vibes: ["group-friendly"],
    },
  ),
  preset(
    "quick-breakfast",
    "☀️",
    "អាហារពេលព្រឹក ឆាប់រហ័ស",
    "Quick breakfast",
    1,
    1.99,
    {
      who: "solo",
      eventOccasion: "quick-meal",
      mealWindow: "breakfast-7-10-am",
      budgetRange: "ultra-budget-under-2",
      restaurantTypes: ["breakfast-restaurant"],
    },
  ),
  preset("cafe-work", "☕", "កាហ្វេ អង្គុយធ្វើការ", "Coffee & focus", 1, 5, {
    who: "solo",
    budgetRange: "student-budget-2-5",
    foodTypes: ["coffee"],
    restaurantTypes: ["work-friendly-cafe"],
    vibes: ["work-friendly", "quiet-and-peaceful"],
  }),
  preset("family-dinner", "👨‍👩‍👧", "បាយល្ងាច ជុំគ្រួសារ", "Family dinner", 4, 10, {
    who: "family",
    eventOccasion: "family-dinner",
    mealWindow: "dinner-7-10-pm",
    budgetRange: "affordable-5-10",
    restaurantTypes: ["family-restaurant"],
    vibes: ["family-friendly"],
  }),
  preset(
    "romantic-dinner",
    "🕯️",
    "អាហារល្ងាច រ៉ូមែនទិក",
    "Romantic dinner",
    2,
    35,
    {
      who: "couple",
      eventOccasion: "romantic-dinner",
      mealWindow: "dinner-7-10-pm",
      budgetRange: "comfortable-20-35",
      restaurantTypes: ["garden-restaurant"],
      vibes: ["romantic", "private-intimate"],
    },
  ),
  preset(
    "rainy-hotpot",
    "🍲",
    "មេឃភ្លៀង ញ៉ាំស៊ុបក្តៅ",
    "Rainy-day hotpot",
    3,
    10,
    {
      who: "friends",
      eventOccasion: "friends-hangout",
      budgetRange: "affordable-5-10",
      foodTypes: ["hotpot"],
      restaurantTypes: ["hotpot-restaurant"],
      weather: ["rainy-day-friendly", "indoor"],
    },
  ),
  preset(
    "vegetarian-lunch",
    "🥗",
    "បាយថ្ងៃត្រង់ បួស",
    "Vegetarian lunch",
    1,
    5,
    {
      who: "solo",
      mealWindow: "lunch-11-am-2-pm",
      budgetRange: "student-budget-2-5",
      dietary: ["vegetarian"],
      restaurantTypes: ["vegetarian-restaurant"],
    },
  ),
  preset(
    "budget-cooking",
    "👩‍🍳",
    "ធ្វើម្ហូបផ្ទះ សន្សំលុយ",
    "Cook something affordable",
    1,
    5,
    {
      who: "solo",
      mealWindow: "dinner-7-10-pm",
      budgetRange: "student-budget-2-5",
    },
    "cook-at-home",
  ),
];

export function applyFoodQuickPreset(
  current: FoodQuickCriteria,
  selected: FoodQuickPreset,
): Required<FoodQuickCriteria> {
  const filters = Object.fromEntries(
    Object.entries(current.filters)
      .filter(([key]) => keep.has(key))
      .map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]),
  );
  for (const [key, value] of Object.entries(selected.filters)) {
    filters[key] =
      keep.has(key) && Array.isArray(value) && Array.isArray(filters[key])
        ? [...new Set([...filters[key], ...value])]
        : Array.isArray(value)
          ? [...value]
          : value;
  }
  return {
    filters,
    peopleCount: selected.peopleCount,
    totalBudget: selected.totalBudget,
    mode: selected.mode,
    keyword: "",
  };
}

export function matchesFoodQuickPreset(
  current: FoodQuickCriteria,
  selected: FoodQuickPreset,
): boolean {
  if (
    current.mode !== selected.mode ||
    current.peopleCount !== selected.peopleCount ||
    current.totalBudget !== selected.totalBudget ||
    current.keyword
  )
    return false;
  for (const key of new Set([
    ...Object.keys(current.filters),
    ...Object.keys(selected.filters),
  ])) {
    const actual = current.filters[key],
      expected = selected.filters[key];
    if (keep.has(key)) {
      if (
        Array.isArray(expected) &&
        (!Array.isArray(actual) ||
          expected.some((value) => !actual.includes(value)))
      )
        return false;
    } else if (JSON.stringify(actual) !== JSON.stringify(expected))
      return false;
  }
  return true;
}
