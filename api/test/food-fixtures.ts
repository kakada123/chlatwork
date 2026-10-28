export function generatedFoodRecipe(overrides: Record<string, unknown> = {}) {
  return {
    nameKm: "បាយលីងខ្ញីនិងផ្សិត",
    nameEn: "Ginger Mushroom Rice",
    descriptionKm: "បាយលីងជាមួយខ្ញី និងផ្សិតស្រស់ ងាយស្រួលធ្វើនៅផ្ទះ។",
    descriptionEn: "Rice stir-fried with ginger and fresh mushrooms.",
    recommendationKm: "ស័ក្តិសមសម្រាប់ញ៉ាំជុំគ្រួសារថ្ងៃនេះ។",
    mealTimes: ["lunch", "dinner"], occasions: ["family", "friends", "solo"],
    prepTimeMinutes: 10, cookTimeMinutes: 15, servings: 4, difficulty: "easy",
    estimatedCostUsd: 6, category: "rice",
    ingredients: [
      { nameKm: "បាយ", nameEn: "Cooked rice", amount: "4 cups" },
      { nameKm: "ផ្សិត", nameEn: "Mushrooms", amount: "300 g" },
    ],
    steps: [
      { textKm: "លាងផ្សិតឱ្យស្អាត រួចចិតជាបន្ទះ។", textEn: "Wash and slice the mushrooms." },
      { textKm: "ឆាផ្សិតជាមួយខ្ញីឱ្យឆ្អិន រួចដាក់បាយចូលឆាឱ្យក្តៅសព្វ។", textEn: "Cook mushrooms with ginger, then stir in the rice until hot throughout." },
    ],
    ...overrides,
  };
}
