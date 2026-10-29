import type { FoodMenuItem } from "../src/food/catalog/food-menu.contract";
export const foodMenuFixture: FoodMenuItem = {
  slug: "bai-sach-chrouk",
  nameKm: "បាយសាច់ជ្រូក",
  nameEn: "Grilled pork with rice",
  descriptionKm: "បាយជាមួយសាច់ជ្រូកអាំង និងជ្រក់បន្លែ។",
  descriptionEn: "Rice served with grilled pork and pickled vegetables.",
  category: "RICE",
  cuisine: "KHMER",
  mealTimes: ["breakfast"],
  tags: ["STREET_FOOD", "QUICK_MEAL"],
  ingredients: [
    { nameKm: "អង្ករ", nameEn: "Rice" },
    { nameKm: "សាច់ជ្រូក", nameEn: "Pork" },
  ],
};
