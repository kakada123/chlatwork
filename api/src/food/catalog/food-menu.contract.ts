export const FOOD_MENU_CATEGORIES = [
  { value: "RICE", label: "Rice", labelKm: "បាយ", icon: "🍚", target: 100 },
  {
    value: "NOODLES",
    label: "Noodles",
    labelKm: "មី និងគុយទាវ",
    icon: "🍜",
    target: 120,
  },
  {
    value: "SOUP",
    label: "Soups",
    labelKm: "សម្ល និងស៊ុប",
    icon: "🥣",
    target: 80,
  },
  { value: "CURRY", label: "Curries", labelKm: "ការី", icon: "🍛", target: 50 },
  {
    value: "STIR_FRY",
    label: "Stir-fries",
    labelKm: "ម្ហូបឆា",
    icon: "🥘",
    target: 80,
  },
  {
    value: "GRILL",
    label: "Grilled food",
    labelKm: "អាំង និងដុត",
    icon: "🍢",
    target: 60,
  },
  {
    value: "SALAD",
    label: "Salads",
    labelKm: "ញាំ និងសាឡាត់",
    icon: "🥗",
    target: 50,
  },
  {
    value: "SEAFOOD",
    label: "Seafood",
    labelKm: "គ្រឿងសមុទ្រ",
    icon: "🦐",
    target: 40,
  },
  {
    value: "SNACK",
    label: "Snacks",
    labelKm: "អាហារសម្រន់",
    icon: "🥟",
    target: 90,
  },
  {
    value: "DESSERT",
    label: "Desserts",
    labelKm: "បង្អែម",
    icon: "🍨",
    target: 80,
  },
  {
    value: "BAKERY",
    label: "Bakery",
    labelKm: "នំប៉័ង និងនំដុត",
    icon: "🥖",
    target: 50,
  },
  {
    value: "DRINK",
    label: "Drinks",
    labelKm: "ភេសជ្ជៈ",
    icon: "🧋",
    target: 130,
  },
  {
    value: "FAST_FOOD",
    label: "Fast food",
    labelKm: "អាហាររហ័ស",
    icon: "🍔",
    target: 70,
  },
] as const;
export const FOOD_MENU_CUISINES = [
  { value: "KHMER", label: "Khmer", labelKm: "ខ្មែរ" },
  { value: "CHINESE", label: "Chinese", labelKm: "ចិន" },
  { value: "VIETNAMESE", label: "Vietnamese", labelKm: "វៀតណាម" },
  { value: "JAPANESE", label: "Japanese", labelKm: "ជប៉ុន" },
  { value: "KOREAN", label: "Korean", labelKm: "កូរ៉េ" },
  { value: "WESTERN", label: "Western", labelKm: "បស្ចិមប្រទេស" },
  { value: "INDIAN", label: "Indian", labelKm: "ឥណ្ឌា" },
  { value: "FUSION", label: "Fusion", labelKm: "ចម្រុះ" },
  { value: "OTHER", label: "Other", labelKm: "ផ្សេងៗ" },
] as const;
export const FOOD_MENU_MEALS = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
] as const;
export const FOOD_MENU_TAGS = [
  "STREET_FOOD",
  "HOME_COOKING",
  "BREAKFAST_STALL",
  "CAFE",
  "QUICK_MEAL",
  "SHAREABLE",
  "CELEBRATION",
  "COMFORT_FOOD",
  "FAMILY_MEAL",
] as const;
export type FoodMenuCategory = (typeof FOOD_MENU_CATEGORIES)[number]["value"];
export type FoodMenuCuisine = (typeof FOOD_MENU_CUISINES)[number]["value"];
export interface FoodMenuItem {
  slug: string;
  nameKm: string;
  nameEn: string;
  descriptionKm: string;
  descriptionEn: string;
  category: FoodMenuCategory;
  cuisine: FoodMenuCuisine;
  mealTimes: Array<(typeof FOOD_MENU_MEALS)[number]>;
  ingredients: Array<{ nameKm: string; nameEn: string }>;
  tags: Array<(typeof FOOD_MENU_TAGS)[number]>;
}
export interface FoodMenuBatch {
  schemaVersion: 1;
  batchNumber: number;
  items: FoodMenuItem[];
}

export function foodMenuNameKey(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{Z}\p{S}\s\u200b-\u200d]+/gu, "");
}
function object(
  value: unknown,
  keys: string[],
  path: string,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== keys.length ||
    Object.keys(value).some((key) => !keys.includes(key))
  )
    throw new Error(`${path}: unexpected or missing fields`);
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  max: number,
  path: string,
  khmer = false,
): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > max ||
    /[<>\u0000-\u001f\u007f]/.test(value) ||
    (khmer && !/[\u1780-\u17ff]/.test(value))
  )
    throw new Error(`${path}: invalid text`);
  return value.trim();
}
function choices<T extends string>(
  value: unknown,
  allowed: readonly T[],
  min: number,
  max: number,
  path: string,
): T[] {
  if (
    !Array.isArray(value) ||
    value.length < min ||
    value.length > max ||
    new Set(value).size !== value.length ||
    value.some(
      (entry) => typeof entry !== "string" || !allowed.includes(entry as T),
    )
  )
    throw new Error(`${path}: invalid choices`);
  return value as T[];
}
export function parseFoodMenuItem(value: unknown, path = "item"): FoodMenuItem {
  const raw = object(
    value,
    [
      "slug",
      "nameKm",
      "nameEn",
      "descriptionKm",
      "descriptionEn",
      "category",
      "cuisine",
      "mealTimes",
      "ingredients",
      "tags",
    ],
    path,
  );
  if (
    /\bthai\b|\bpad[\s-]*thai\b|\btom[\s-]*yum\b|\btom[\s-]*kha\b|\bmassaman\b|\bpad[\s-]*see[\s-]*ew\b|\bkhao[\s-]*soi\b|ថៃ/iu.test(
      JSON.stringify(raw),
    )
  )
    throw new Error(`${path}: Thai menu items are excluded from this catalog`);
  const slug = text(raw.slug, 96, `${path}.slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !/[a-z]/.test(slug))
    throw new Error(
      `${path}.slug: use lowercase ASCII words separated by hyphens`,
    );
  const nameKm = text(raw.nameKm, 160, `${path}.nameKm`, true);
  const nameEn = text(raw.nameEn, 160, `${path}.nameEn`);
  if (
    !/[a-z]/i.test(nameEn) ||
    [nameKm, nameEn].some(
      (name) => !foodMenuNameKey(name) || foodMenuNameKey(name).length > 512,
    )
  )
    throw new Error(`${path}: invalid normalized names`);
  const category = choices(
    [raw.category],
    FOOD_MENU_CATEGORIES.map((entry) => entry.value),
    1,
    1,
    `${path}.category`,
  )[0];
  const cuisine = choices(
    [raw.cuisine],
    FOOD_MENU_CUISINES.map((entry) => entry.value),
    1,
    1,
    `${path}.cuisine`,
  )[0];
  if (
    !Array.isArray(raw.ingredients) ||
    !raw.ingredients.length ||
    raw.ingredients.length > 12
  )
    throw new Error(`${path}.ingredients: expected 1-12 ingredients`);
  const ingredients = raw.ingredients.map((value, index) => {
    const ingredient = object(
      value,
      ["nameKm", "nameEn"],
      `${path}.ingredients[${index}]`,
    );
    return {
      nameKm: text(
        ingredient.nameKm,
        80,
        `${path}.ingredients[${index}].nameKm`,
        true,
      ),
      nameEn: text(
        ingredient.nameEn,
        80,
        `${path}.ingredients[${index}].nameEn`,
      ),
    };
  });
  return {
    slug,
    nameKm,
    nameEn,
    descriptionKm: text(raw.descriptionKm, 500, `${path}.descriptionKm`, true),
    descriptionEn: text(raw.descriptionEn, 500, `${path}.descriptionEn`),
    category,
    cuisine,
    mealTimes: choices(
      raw.mealTimes,
      FOOD_MENU_MEALS,
      1,
      4,
      `${path}.mealTimes`,
    ),
    ingredients,
    tags: choices(raw.tags, FOOD_MENU_TAGS, 0, 6, `${path}.tags`),
  };
}
export function parseFoodMenuBatch(value: unknown): FoodMenuBatch {
  const raw = object(value, ["schemaVersion", "batchNumber", "items"], "batch");
  if (
    raw.schemaVersion !== 1 ||
    !Number.isInteger(raw.batchNumber) ||
    (raw.batchNumber as number) < 1 ||
    (raw.batchNumber as number) > 20
  )
    throw new Error("batch: expected schemaVersion 1 and batchNumber 1-20");
  if (!Array.isArray(raw.items) || !raw.items.length || raw.items.length > 50)
    throw new Error("batch.items: expected 1-50 records");
  const items = raw.items.map((item, index) =>
    parseFoodMenuItem(item, `items[${index}]`),
  );
  for (const field of ["slug", "nameKm", "nameEn"] as const) {
    const keys = items.map((item) =>
      field === "slug" ? item.slug : foodMenuNameKey(item[field]),
    );
    if (new Set(keys).size !== keys.length)
      throw new Error(`batch.items: duplicate ${field}`);
  }
  return { schemaVersion: 1, batchNumber: raw.batchNumber as number, items };
}
