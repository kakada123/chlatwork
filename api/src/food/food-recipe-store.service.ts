import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { parseGeneratedRecipes } from "./food-ai-recipes";
import type { KhmerRecipe } from "./food.types";
import type { FoodSavedRecipesDto } from "./dto/food-saved-recipes.dto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface SavedRow {
  id: string;
  recipe: unknown;
  createdAt: Date;
}

@Injectable()
export class FoodRecipeStore {
  private readonly logger = new Logger(FoodRecipeStore.name);
  constructor(private readonly prisma: PrismaService) {}

  async assertAvailable(): Promise<void> {
    try {
      const rows = await this.prisma.$queryRaw<
        Array<{ available: boolean }>
      >`SELECT to_regclass('food_ai_recipes') IS NOT NULL AS available`;
      if (rows[0]?.available !== true) throw new Error("Schema unavailable");
    } catch {
      this.unavailable();
    }
  }

  async saveGenerated(
    recipes: KhmerRecipe[],
    ownerId: string | null,
  ): Promise<KhmerRecipe[]> {
    if (ownerId !== null) this.owner(ownerId);
    try {
      if (
        !recipes.length ||
        recipes.length > 3 ||
        recipes.some((recipe) => recipe.source !== "gemini")
      )
        throw new Error("Invalid generated batch");
      const createdAt = new Date();
      // Revalidation constructs an allowlisted payload; criteria, prompts and account data cannot hitchhike into JSON.
      const rows = recipes.map((recipe) => ({
        id: randomUUID(),
        recipe: parseGeneratedRecipes(
          { recipes: [recipe] },
          { peopleCount: recipe.servings },
          1,
        )[0],
      }));
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO food_ai_recipes (id, owner_id, recipe_id, recipe, created_at)
        VALUES ${Prisma.join(rows.map((row) => Prisma.sql`(${row.id}::uuid, ${ownerId}::uuid, ${row.recipe.id}, ${JSON.stringify(row.recipe)}::jsonb, ${createdAt})`))}
      `);
      return rows.map((row) => ({
        ...row.recipe,
        savedRecipeId: row.id,
        savedAt: createdAt.toISOString(),
        savedToAccount: ownerId !== null,
      }));
    } catch {
      return this.unavailable();
    }
  }

  async list(ownerId: string, query: FoodSavedRecipesDto) {
    this.owner(ownerId);
    return this.listPage(ownerId, query);
  }

  async listShared(query: FoodSavedRecipesDto) {
    return this.listPage(null, query);
  }

  private async listPage(ownerId: string | null, query: FoodSavedRecipesDto) {
    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 20)
      throw new BadRequestException("Invalid saved-recipe page size.");
    const cursor = this.cursor(query.cursor);
    try {
      const scope =
        ownerId === null
          ? Prisma.sql`TRUE`
          : Prisma.sql`owner_id = ${ownerId}::uuid`;
      const boundary = cursor
        ? Prisma.sql`AND (created_at, id) < (${cursor.at}, ${cursor.id}::uuid)`
        : Prisma.empty;
      const rows = await this.prisma.$queryRaw<SavedRow[]>(Prisma.sql`
        SELECT id, recipe, created_at AS "createdAt" FROM food_ai_recipes
        WHERE ${scope} ${boundary}
        ORDER BY created_at DESC, id DESC LIMIT ${limit + 1}
      `);
      const visible = rows.slice(0, limit);
      const last = visible.at(-1);
      return {
        recipes: visible.map((row) => this.fromRow(row, ownerId !== null)),
        ...(rows.length > limit && last
          ? {
              nextCursor: Buffer.from(
                JSON.stringify({
                  at: last.createdAt.toISOString(),
                  id: last.id,
                }),
              ).toString("base64url"),
            }
          : {}),
      };
    } catch {
      return this.unavailable();
    }
  }

  async getShared(id: string): Promise<KhmerRecipe> {
    if (!UUID.test(id)) throw new NotFoundException("Recipe not found.");
    try {
      const rows = await this.prisma.$queryRaw<SavedRow[]>(Prisma.sql`
        SELECT id, recipe, created_at AS "createdAt" FROM food_ai_recipes
        WHERE id = ${id}::uuid LIMIT 1
      `);
      if (rows[0]) return this.fromRow(rows[0], false);
    } catch {
      return this.unavailable();
    }
    throw new NotFoundException("Recipe not found.");
  }

  async get(ownerId: string, id: string): Promise<KhmerRecipe> {
    this.owner(ownerId);
    if (!UUID.test(id))
      throw new BadRequestException("Invalid saved-recipe ID.");
    let rows: SavedRow[];
    try {
      rows = await this.prisma.$queryRaw<
        SavedRow[]
      >`SELECT id, recipe, created_at AS "createdAt" FROM food_ai_recipes WHERE owner_id = ${ownerId}::uuid AND id = ${id}::uuid LIMIT 1`;
      if (rows[0]) return this.fromRow(rows[0]);
    } catch {
      return this.unavailable();
    }
    throw new NotFoundException("Saved recipe not found.");
  }

  private fromRow(row: SavedRow, savedToAccount = true): KhmerRecipe {
    const servings =
      row.recipe && typeof row.recipe === "object"
        ? (row.recipe as Record<string, unknown>).servings
        : undefined;
    const recipe = parseGeneratedRecipes(
      { recipes: [row.recipe] },
      { peopleCount: servings as number },
      1,
    )[0];
    // Public cooking instructions must not expose the personalized explanation or imply account ownership.
    if (!savedToAccount) delete recipe.recommendationKm;
    return {
      ...recipe,
      savedRecipeId: row.id,
      savedAt: row.createdAt.toISOString(),
      savedToAccount,
    };
  }
  private owner(id: string) {
    if (!UUID.test(id))
      throw new BadRequestException("An authenticated account is required.");
  }
  private cursor(value?: string): { at: Date; id: string } | undefined {
    if (!value) return undefined;
    try {
      if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value))
        throw new Error();
      const cursor: unknown = JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      );
      if (!cursor || typeof cursor !== "object") throw new Error();
      const { at, id } = cursor as Record<string, unknown>;
      if (typeof at !== "string" || typeof id !== "string" || !UUID.test(id))
        throw new Error();
      const date = new Date(at);
      if (!Number.isFinite(date.getTime()) || date.toISOString() !== at)
        throw new Error();
      return { at: date, id };
    } catch {
      throw new BadRequestException("Invalid saved-recipe cursor.");
    }
  }
  private unavailable(): never {
    this.logger.warn({
      message: "Food recipe storage unavailable",
      reason: "STORAGE_UNAVAILABLE",
    });
    throw new ServiceUnavailableException(
      "Recipe saving is unavailable. Please try again later.",
    );
  }
}
