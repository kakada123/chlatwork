import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  FOOD_MENU_CATEGORIES,
  FOOD_MENU_CUISINES,
  FOOD_MENU_MEALS,
  FOOD_MENU_TAGS,
  parseFoodMenuItem,
} from "./food-menu.contract";
import type { FoodMenuQueryDto } from "./food-menu-query.dto";

@Injectable()
export class FoodMenuCatalogService {
  private readonly logger = new Logger(FoodMenuCatalogService.name);
  constructor(private readonly prisma: PrismaService) {}

  async list(query: FoodMenuQueryDto) {
    const limit = query.limit ?? 24;
    const filters = [Prisma.sql`is_active = TRUE`, Prisma.sql`cuisine <> 'THAI'`];
    const keyword = query.q?.trim();
    if (keyword) {
      // Wildcard characters are literal user text; parameter binding separately prevents SQL injection.
      const pattern = `%${keyword.replace(/[\\%_]/g, "\\$&")}%`;
      filters.push(
        Prisma.sql`(name_km ILIKE ${pattern} ESCAPE E'\\\\' OR name_en ILIKE ${pattern} ESCAPE E'\\\\' OR description_km ILIKE ${pattern} ESCAPE E'\\\\' OR description_en ILIKE ${pattern} ESCAPE E'\\\\')`,
      );
    }
    if (query.category) filters.push(Prisma.sql`category = ${query.category}`);
    if (query.cuisine) filters.push(Prisma.sql`cuisine = ${query.cuisine}`);
    if (query.mealTime)
      filters.push(Prisma.sql`meal_times @> ARRAY[${query.mealTime}]::text[]`);
    if (query.tag)
      filters.push(Prisma.sql`tags @> ARRAY[${query.tag}]::text[]`);
    const where = Prisma.join(filters, " AND ");
    const cursor = query.after
      ? Prisma.sql`AND slug > ${query.after}`
      : Prisma.empty;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const counts = await tx.$queryRaw<Array<{ total: bigint }>>(
          Prisma.sql`SELECT COUNT(*) AS total FROM food_menu_items WHERE ${where}`,
        );
        const rows = await tx.$queryRaw<unknown[]>(Prisma.sql`
          SELECT slug, name_km AS "nameKm", name_en AS "nameEn", description_km AS "descriptionKm", description_en AS "descriptionEn",
            category, cuisine, meal_times AS "mealTimes", ingredients, tags
          FROM food_menu_items WHERE ${where} ${cursor} ORDER BY slug ASC LIMIT ${limit + 1}
        `);
        const total = Number(counts[0]?.total ?? 0);
        if (!Number.isSafeInteger(total) || total < 0)
          throw new Error("Invalid catalog count");
        const items = rows.slice(0, limit).map((row) => parseFoodMenuItem(row));
        return {
          items,
          total,
          ...(rows.length > limit && items.length
            ? { nextCursor: items[items.length - 1].slug }
            : {}),
          categories: FOOD_MENU_CATEGORIES.map(
            ({ target: _target, ...category }) => category,
          ),
          cuisines: FOOD_MENU_CUISINES,
          mealTimes: FOOD_MENU_MEALS,
          tags: FOOD_MENU_TAGS,
          source: "AI_ASSISTED" as const,
        };
      });
    } catch {
      this.logger.warn({
        message: "Food menu catalog unavailable",
        reason: "CATALOG_STORAGE_UNAVAILABLE",
      });
      throw new ServiceUnavailableException(
        "Food menu catalog is unavailable. Please try again later.",
      );
    }
  }
}
