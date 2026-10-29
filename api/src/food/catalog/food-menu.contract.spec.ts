import { parseFoodMenuBatch, foodMenuNameKey } from "./food-menu.contract";

export const menuFixture = {
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

describe("Food menu import contract", () => {
  it("accepts a bounded bilingual menu batch and computes punctuation-insensitive names", () => {
    expect(
      parseFoodMenuBatch({
        schemaVersion: 1,
        batchNumber: 1,
        items: [menuFixture],
      }).items[0].slug,
    ).toBe("bai-sach-chrouk");
    expect(foodMenuNameKey(" Grilled-Pork with Rice! ")).toBe(
      foodMenuNameKey("grilled pork with rice"),
    );
  });
  it.each([
    { slug: "unsafe'); DROP TABLE users;--" },
    { nameKm: "English only" },
    { nameEn: "<script>name</script>" },
    { category: "INVENTED" },
    { cuisine: "unknown" },
    { mealTimes: [] },
    { tags: ["ALLERGEN_FREE"] },
    { cuisine: "THAI" },
    { nameEn: "Pad Thai", cuisine: "OTHER" },
    { nameKm: "អាហារថៃ" },
    { ingredients: [] },
    { ingredients: [{ nameKm: "សាច់", nameEn: "Meat", secret: "unexpected" }] },
    { descriptionEn: "x".repeat(501) },
    { priceUsd: 3 },
    { isActive: true },
    { sourceBatch: "forged" },
  ])("rejects malformed or unsupported generated fields %j", (overrides) => {
    expect(() =>
      parseFoodMenuBatch({
        schemaVersion: 1,
        batchNumber: 1,
        items: [{ ...menuFixture, ...overrides }],
      }),
    ).toThrow();
  });
  it("rejects invalid batch metadata and oversized arrays", () => {
    for (const input of [
      null,
      { schemaVersion: 2, batchNumber: 1, items: [menuFixture] },
      { schemaVersion: 1, batchNumber: 21, items: [menuFixture] },
      { schemaVersion: 1, batchNumber: 1, items: Array(51).fill(menuFixture) },
    ])
      expect(() => parseFoodMenuBatch(input)).toThrow();
  });
});
