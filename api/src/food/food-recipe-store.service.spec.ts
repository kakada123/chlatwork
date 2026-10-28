import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { FoodRecipeStore } from "./food-recipe-store.service";
import { parseGeneratedRecipes } from "./food-ai-recipes";
import { generatedFoodRecipe } from "../../test/food-fixtures";

describe("FoodRecipeStore", () => {
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const savedId = "33333333-3333-4333-8333-333333333333";
  const recipe = parseGeneratedRecipes(
    { recipes: [generatedFoodRecipe()] },
    { peopleCount: 4 },
    1,
  )[0];
  let prisma: { $queryRaw: jest.Mock; $executeRaw: jest.Mock };
  let store: FoodRecipeStore;
  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ available: true }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    store = new FoodRecipeStore(prisma as never);
  });

  it("saves only revalidated recipe fields with an optional verified account owner", async () => {
    const saved = await store.saveGenerated(
      [
        {
          ...recipe,
          rawPrompt: "private prompt",
          lat: 11,
          filters: { allergies: "private allergy" },
        } as never,
      ],
      owner,
    );
    expect(saved[0]).toMatchObject({
      id: recipe.id,
      savedToAccount: true,
      source: "gemini",
    });
    expect(saved[0].savedRecipeId).toMatch(/^[0-9a-f-]{36}$/);
    const query = prisma.$executeRaw.mock.calls[0][0];
    expect(query.values).toContain(owner);
    expect(JSON.stringify(query.values)).not.toContain("private");
    expect(query.sql).not.toContain(owner);
    const guest = await store.saveGenerated([recipe], null);
    expect(guest[0].savedToAccount).toBe(false);
  });

  it("detects a missing table and reports a safe storage failure", async () => {
    prisma.$queryRaw.mockResolvedValue([{ available: false }]);
    await expect(store.assertAvailable()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    prisma.$executeRaw.mockRejectedValue(new Error("private database details"));
    await expect(store.saveGenerated([recipe], owner)).rejects.toThrow(
      "Recipe saving is unavailable. Please try again later.",
    );
  });

  it("never writes an invalid generated recipe", async () => {
    await expect(
      store.saveGenerated([{ ...recipe, ingredients: [] }], owner),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("reads only the authenticated account with a stable cursor and no public history", async () => {
    const row = {
      id: savedId,
      recipe,
      createdAt: new Date("2026-10-28T03:00:00Z"),
    };
    prisma.$queryRaw.mockResolvedValue([row, { ...row, id: other }]);
    const first = await store.list(owner, { limit: 1 });
    expect(first.recipes).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    expect(prisma.$queryRaw.mock.calls[0][0].values).toContain(owner);
    prisma.$queryRaw.mockResolvedValue([]);
    await store.list(owner, { limit: 1, cursor: first.nextCursor });
    const query = prisma.$queryRaw.mock.calls[1][0];
    expect(query.values).toContain(owner);
    expect(query.values).toContain(savedId);
    await expect(store.list("", { limit: 1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("rejects malformed cursors and returns not found for another owner's saved ID", async () => {
    await expect(
      store.list(owner, { cursor: "invalid" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    prisma.$queryRaw.mockResolvedValue([]);
    await expect(store.get(owner, savedId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.$queryRaw.mock.calls[0].slice(1)).toEqual(
      expect.arrayContaining([owner, savedId]),
    );
  });
});
