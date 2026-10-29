import { ServiceUnavailableException } from "@nestjs/common";
import { FoodMenuCatalogService } from "./food-menu-catalog.service";
import { foodMenuFixture } from "../../../test/food-menu-fixtures";
import { FoodMenuQueryDto } from "./food-menu-query.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

describe("Food menu catalog", () => {
  let prisma: { $queryRaw: jest.Mock; $transaction: jest.Mock };
  let service: FoodMenuCatalogService;
  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn(),
      $transaction: jest.fn(async (work) => work(prisma)),
    };
    service = new FoodMenuCatalogService(prisma as never);
  });
  it("lists only active database records with actual counts and a stable cursor", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 1000n }])
      .mockResolvedValueOnce([
        foodMenuFixture,
        {
          ...foodMenuFixture,
          slug: "other",
          nameKm: "មុខម្ហូបផ្សេង",
          nameEn: "Other menu",
        },
      ]);
    const result = await service.list({ limit: 1 });
    expect(result.total).toBe(1000);
    expect(result.items).toEqual([foodMenuFixture]);
    expect(result.nextCursor).toBe(foodMenuFixture.slug);
    expect(result.categories).toHaveLength(13);
    expect(prisma.$queryRaw.mock.calls[1][0].sql).toContain("is_active = TRUE");
    expect(prisma.$queryRaw.mock.calls[1][0].sql).toContain("cuisine <> 'THAI'");
  });
  it("parameterizes literal Khmer/English search, filters and cursor values", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 1n }])
      .mockResolvedValueOnce([foodMenuFixture]);
    await service.list({
      q: "rice_100%",
      category: "RICE",
      cuisine: "KHMER",
      mealTime: "breakfast",
      tag: "STREET_FOOD",
      after: "bai-cha",
      limit: 24,
    });
    const query = prisma.$queryRaw.mock.calls[1][0];
    expect(query.values).toEqual(
      expect.arrayContaining([
        "%rice\\_100\\%%",
        "RICE",
        "KHMER",
        "breakfast",
        "STREET_FOOD",
        "bai-cha",
        25,
      ]),
    );
    expect(query.sql).not.toContain("rice_100%");
  });
  it("returns honest empty results and safe errors without a hardcoded menu fallback", async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ total: 0n }])
      .mockResolvedValueOnce([]);
    expect((await service.list({})).items).toEqual([]);
    prisma.$queryRaw.mockRejectedValue(new Error("private database details"));
    await expect(service.list({})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
  it.each([
    { limit: 49 },
    { limit: "10x" },
    { category: "invented" },
    { cuisine: "invented" },
    { mealTime: "all-day" },
    { after: "x');DROP TABLE users;--" },
    { q: "x".repeat(121) },
  ])("rejects invalid public query %j", async (input) => {
    expect(
      (await validate(plainToInstance(FoodMenuQueryDto, input))).length,
    ).toBeGreaterThan(0);
  });
});
