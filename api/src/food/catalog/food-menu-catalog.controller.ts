import { Controller, Get, Header, Query } from "@nestjs/common";
import { FoodMenuCatalogService } from "./food-menu-catalog.service";
import { FoodMenuQueryDto } from "./food-menu-query.dto";

@Controller("food/menu-catalog")
export class FoodMenuCatalogController {
  constructor(private readonly catalog: FoodMenuCatalogService) {}
  @Get()
  @Header("Cache-Control", "no-store")
  list(@Query() query: FoodMenuQueryDto) {
    return this.catalog.list(query);
  }
}
