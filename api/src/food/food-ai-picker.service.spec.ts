import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";
import { FoodAiPickerService } from "./food-ai-picker.service";
import { generatedFoodRecipe } from "../../test/food-fixtures";

jest.mock("@google/genai", () => ({ GoogleGenAI: jest.fn() }));

describe("FoodAiPickerService", () => {
  const candidates = [
    { id: "google:one", name: "Restaurant One", isPriceVerified: false },
    { id: "google:two", name: "Restaurant Two", isPriceVerified: false },
  ];
  const config = {
    AI_ENABLED: "true",
    GEMINI_API_KEY: "test_gemini_key",
    GEMINI_TEXT_MODEL: "gemini-3.5-flash-lite",
    AI_PROVIDER_TIMEOUT_MS: 12000,
  };
  let generateContent: jest.Mock;
  let picker: FoodAiPickerService;

  beforeEach(() => {
    generateContent = jest.fn().mockResolvedValue({
      text: JSON.stringify({
        id: "google:two",
        messageKm: "សាកល្បងជម្រើសនេះសម្រាប់អាហារថ្ងៃត្រង់។",
      }),
      candidates: [{ finishReason: "STOP" }],
    });
    (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
      models: { generateContent },
    }));
    picker = new FoodAiPickerService(new ConfigService(config));
  });

  it("selects a known candidate using the existing Gemini settings and the supplied criteria", async () => {
    const result = await picker.choose(candidates, {
      mode: "dine-out",
      mealTime: "lunch",
      peopleCount: 3,
      totalBudget: 10,
    });
    expect(result.id).toBe("google:two");
    expect(result.messageKm).toContain("ថ្ងៃត្រង់");
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.5-flash-lite");
    expect(JSON.parse(request.contents)).toMatchObject({
      criteria: {
        mode: "dine-out",
        mealTime: "lunch",
        peopleCount: 3,
        totalBudget: 10,
      },
      candidates,
    });
    expect(request.config.responseJsonSchema.properties.id.enum).toEqual([
      "google:one",
      "google:two",
    ]);
    expect(
      (GoogleGenAI as unknown as jest.Mock).mock.calls.at(-1)[0].httpOptions,
    ).toMatchObject({
      timeout: 12000,
      retryOptions: { attempts: 1 },
    });
  });

  it.each([
    '{"id":"invented-place","messageKm":"កន្លែងថ្មី"}',
    '{"id":"google:one","messageKm":""}',
    '{"id":"google:one","messageKm":"<script>alert(1)</script>"}',
    "invalid json",
    "null",
  ])("rejects malformed and ungrounded selections (%s)", async (text) => {
    generateContent.mockResolvedValue({
      text,
      candidates: [{ finishReason: "STOP" }],
    });
    await expect(picker.choose(candidates, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("rejects incomplete model output", async () => {
    generateContent.mockResolvedValue({
      text: '{"id":"google:one","messageKm":"ម្ហូប"}',
      candidates: [{ finishReason: "MAX_TOKENS" }],
    });
    await expect(picker.choose(candidates, {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([{ AI_ENABLED: "false" }, { GEMINI_API_KEY: "dummy_gemini_key" }])(
    "respects disabled or unconfigured AI",
    async (overrides) => {
      picker = new FoodAiPickerService(
        new ConfigService({ ...config, ...overrides }),
      );
      await expect(picker.choose(candidates, {})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(generateContent).not.toHaveBeenCalled();
    },
  );

  it("does not call the provider for an empty candidate list", async () => {
    await expect(picker.choose([], {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("does not retry a failed paid request or expose provider details", async () => {
    generateContent.mockRejectedValue(new Error("private provider detail"));
    await expect(picker.choose(candidates, {})).rejects.toThrow(
      "AI food picking is unavailable. Please try again later.",
    );
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  describe("Gemini recipe generation", () => {
    let warning: jest.SpyInstance;
    beforeEach(() => {
      warning = jest
        .spyOn(Logger.prototype, "warn")
        .mockImplementation(() => undefined);
    });
    afterEach(() => warning.mockRestore());

    it.each([
      [400, "INVALID_REQUEST"],
      [401, "AUTHENTICATION_FAILED"],
      [403, "PERMISSION_DENIED"],
      [404, "MODEL_OR_RESOURCE_NOT_FOUND"],
      [429, "RATE_LIMITED"],
      [503, "PROVIDER_UNAVAILABLE"],
    ])(
      "logs only safe provider status and category for HTTP %s",
      async (status, reason) => {
        generateContent.mockRejectedValue({
          status,
          message: "private provider response",
          key: "private key",
          details: { prompt: "private prompt" },
        });
        await expect(picker.generateRecipes({})).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
        expect(warning).toHaveBeenCalledWith(
          expect.objectContaining({
            stage: "provider",
            reason,
            providerStatus: status,
          }),
        );
        expect(JSON.stringify(warning.mock.calls)).not.toContain("private");
        expect(generateContent).toHaveBeenCalledTimes(1);
      },
    );

    it("distinguishes a provider timeout without logging its raw error", async () => {
      generateContent.mockRejectedValue(
        Object.assign(new Error("private request"), { name: "AbortError" }),
      );
      await expect(picker.generateRecipes({})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(warning).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "provider",
          reason: "TIMEOUT",
          providerStatus: null,
        }),
      );
      expect(JSON.stringify(warning.mock.calls)).not.toContain("private");
    });

    it("classifies Google's nested inference deadline error without logging internal infrastructure", async () => {
      generateContent.mockRejectedValue({
        status: 500,
        message:
          "[original: beyond::dependency::DEADLINE_EXCEEDED] Failed while fetching private stream from private internal model",
      });
      await expect(picker.generateRecipes({})).rejects.toThrow(
        "AI recipe generation timed out. Please try again later.",
      );
      expect(warning).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "provider",
          reason: "TIMEOUT",
          providerStatus: 500,
        }),
      );
      expect(JSON.stringify(warning.mock.calls)).not.toContain("private");
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        {
          candidates: [{ finishReason: "MAX_TOKENS" }],
          text: "private partial output",
        },
        "OUTPUT_LIMIT",
        "MAX_TOKENS",
      ],
      [{ promptFeedback: { blockReason: "SAFETY" } }, "BLOCKED", null],
      [
        { candidates: [{ finishReason: "STOP" }], text: "" },
        "EMPTY_RESPONSE",
        "STOP",
      ],
      [
        {
          candidates: [{ finishReason: "private unknown reason" }],
          text: "private output",
        },
        "INCOMPLETE_RESPONSE",
        "UNKNOWN",
      ],
    ])(
      "distinguishes incomplete or blocked responses safely (%s)",
      async (response, reason, finishReason) => {
        generateContent.mockResolvedValue(response);
        await expect(picker.generateRecipes({})).rejects.toBeInstanceOf(
          ServiceUnavailableException,
        );
        expect(warning).toHaveBeenCalledWith(
          expect.objectContaining({ stage: "response", reason, finishReason }),
        );
        expect(JSON.stringify(warning.mock.calls)).not.toContain("private");
        expect(generateContent).toHaveBeenCalledTimes(1);
      },
    );

    it("distinguishes invalid JSON from semantic validation failures", async () => {
      generateContent.mockResolvedValue({
        candidates: [{ finishReason: "STOP" }],
        text: "private malformed json",
      });
      await expect(picker.generateRecipes({})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(warning).toHaveBeenLastCalledWith(
        expect.objectContaining({ stage: "json", reason: "INVALID_JSON" }),
      );
      reply([generatedFoodRecipe({ servings: 3 })]);
      await expect(
        picker.generateRecipes({ peopleCount: 4 }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warning).toHaveBeenLastCalledWith(
        expect.objectContaining({
          stage: "validation",
          reason: "SERVINGS_MISMATCH",
          validationField: "servings",
        }),
      );
      reply([generatedFoodRecipe({ nameEn: "private".repeat(30) })]);
      await expect(
        picker.generateRecipes({ peopleCount: 4 }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warning).toHaveBeenLastCalledWith(
        expect.objectContaining({
          reason: "INVALID_TEXT",
          validationField: "nameEn",
        }),
      );
      expect(JSON.stringify(warning.mock.calls)).not.toContain("private");
    });

    it("identifies repeated-only output without logging recipe names or history", async () => {
      reply([generatedFoodRecipe()]);
      await expect(
        picker.generateRecipes({
          peopleCount: 4,
          recentRecipeNames: ["Ginger Mushroom Rice"],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(warning).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: "validation",
          reason: "REPEATED_ONLY",
          validationField: "recipes",
        }),
      );
      expect(JSON.stringify(warning.mock.calls)).not.toContain("Ginger");
    });
    function reply(recipes: unknown[]) {
      generateContent.mockResolvedValue({
        text: JSON.stringify({ recipes }),
        candidates: [{ finishReason: "STOP" }],
      });
    }

    it("generates a complete recipe using current criteria and the existing Gemini configuration", async () => {
      reply([generatedFoodRecipe()]);
      const recipes = await picker.generateRecipes({
        mode: "cook-at-home",
        mealTime: "dinner",
        occasion: "family",
        peopleCount: 4,
        totalBudget: 12,
        cuisine: "mushroom",
        limit: 1,
        recentRecipeNames: ["Beef Lok Lak"],
      });
      expect(recipes).toHaveLength(1);
      expect(recipes[0]).toMatchObject({
        source: "gemini",
        nameEn: "Ginger Mushroom Rice",
        servings: 4,
        ingredients: [{ nameEn: "Cooked rice" }, { nameEn: "Mushrooms" }],
        steps: [{ step: 1 }, { step: 2 }],
      });
      expect(recipes[0].id).toMatch(/^gemini-/);
      const request = generateContent.mock.calls[0][0];
      expect(request.model).toBe("gemini-3.5-flash-lite");
      expect(JSON.parse(request.contents)).toMatchObject({
        criteria: {
          peopleCount: 4,
          totalBudget: 12,
          cuisine: "mushroom",
          recentRecipeNames: ["Beef Lok Lak"],
        },
        count: 1,
      });
      expect(JSON.parse(request.contents).candidates).toBeUndefined();
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it("removes recently shown recipes and duplicate names even when case and punctuation differ", async () => {
      reply([
        generatedFoodRecipe({ nameEn: " GINGER-mushroom rice! " }),
        generatedFoodRecipe({
          nameKm: "សម្លល្ពៅ",
          nameEn: "Pumpkin Soup",
          category: "soup",
        }),
        generatedFoodRecipe({
          nameKm: "សម្លល្ពៅថ្មី",
          nameEn: "pumpkin soup!",
          category: "soup",
        }),
      ]);
      const recipes = await picker.generateRecipes({
        peopleCount: 4,
        limit: 3,
        recentRecipeNames: ["ginger mushroom rice"],
      });
      expect(recipes.map((recipe) => recipe.nameEn)).toEqual(["Pumpkin Soup"]);
    });

    it("does not recycle a recipe or retry the provider when all generated choices are recent", async () => {
      reply([generatedFoodRecipe()]);
      await expect(
        picker.generateRecipes({
          peopleCount: 4,
          limit: 1,
          recentRecipeNames: ["បាយលីងខ្ញីនិងផ្សិត"],
        }),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(generateContent).toHaveBeenCalledTimes(1);
    });

    it.each([
      { ingredients: [] },
      { steps: [] },
      { servings: 3 },
      { estimatedCostUsd: -1 },
      { estimatedCostUsd: 20 },
      { prepTimeMinutes: -1 },
      { cookTimeMinutes: 0.5 },
      { nameKm: "English only" },
      { descriptionKm: "<script>អី</script>" },
      { mealTimes: ["breakfast"] },
      { difficulty: "unknown" },
    ])(
      "rejects malformed, mismatched or over-budget recipe output (%j)",
      async (overrides) => {
        reply([generatedFoodRecipe(overrides)]);
        await expect(
          picker.generateRecipes({
            peopleCount: 4,
            totalBudget: 12,
            mealTime: "dinner",
            limit: 1,
          }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
      },
    );

    it("fails without a static-catalog fallback when generation is disabled, interrupted or unavailable", async () => {
      generateContent.mockRejectedValueOnce(
        new Error("private provider failure"),
      );
      await expect(
        picker.generateRecipes({ peopleCount: 4, limit: 1 }),
      ).rejects.toThrow(
        "AI recipe generation is unavailable. Please try again later.",
      );
      expect(generateContent).toHaveBeenCalledTimes(1);
      const disabled = new FoodAiPickerService(
        new ConfigService({ ...config, AI_ENABLED: "false" }),
      );
      await expect(disabled.generateRecipes({})).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(generateContent).toHaveBeenCalledTimes(1);
    });
  });
});
