import { GUARDS_METADATA } from "@nestjs/common/constants";
import {
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { FoodOptionalAuthGuard } from "./food-optional-auth.guard";
import { FoodController } from "./food.controller";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("Food saved-recipe ownership", () => {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    role: "USER",
  } as const;
  const context = (authorization?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization } }),
      }),
    }) as never;
  it("allows guests but never silently discards an invalid supplied account session", () => {
    const guard = new FoodOptionalAuthGuard();
    expect(guard.handleRequest(null, null, null, context())).toBeNull();
    expect(guard.handleRequest(null, user, null, context("Bearer dummy"))).toBe(
      user,
    );
    expect(() =>
      guard.handleRequest(null, null, null, context("Bearer expired-dummy")),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.handleRequest(
        new Error("private"),
        null,
        null,
        context("Bearer dummy"),
      ),
    ).toThrow(ServiceUnavailableException);
  });
  it("protects both history routes and uses server identity on generation and reads", () => {
    for (const method of ["sharedRecipes", "sharedRecipe"] as const)
      expect(Reflect.getMetadata(GUARDS_METADATA, FoodController.prototype[method])).toBeUndefined();
    for (const method of ["savedRecipes", "savedRecipe"] as const)
      expect(
        Reflect.getMetadata(GUARDS_METADATA, FoodController.prototype[method]),
      ).toContain(JwtAuthGuard);
    for (const method of ["recommend", "pick", "getRandomFood"] as const)
      expect(
        Reflect.getMetadata(GUARDS_METADATA, FoodController.prototype[method]),
      ).toContain(FoodOptionalAuthGuard);
    const service = {
      recommend: jest.fn(),
      pick: jest.fn(),
      getRandomFood: jest.fn(),
      getSavedRecipes: jest.fn(),
      getSavedRecipe: jest.fn(),
    };
    const controller = new FoodController(service as never);
    controller.recommend({ mode: "cook-at-home" }, user);
    controller.pick({ mode: "cook-at-home" }, user);
    controller.savedRecipes(user, { limit: 10 });
    controller.savedRecipe(user, "saved-id");
    expect(service.recommend).toHaveBeenCalledWith(
      { mode: "cook-at-home" },
      user.id,
    );
    expect(service.pick).toHaveBeenCalledWith(
      { mode: "cook-at-home" },
      user.id,
    );
    expect(service.getSavedRecipes).toHaveBeenCalledWith(user.id, {
      limit: 10,
    });
    expect(service.getSavedRecipe).toHaveBeenCalledWith(user.id, "saved-id");
  });
});
