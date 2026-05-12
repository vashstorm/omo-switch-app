import { test, expect } from "@playwright/test";

const mockProfiles = {
  profiles: [{ id: "profile-cascade", label: "Cascade Profile" }],
};

const mockProfileDetail = {
  baseline: {
    agents: {
      planner: { model: "openai/gpt-4o", fallback_models: [] },
    },
    categories: {
      code: { model: "anthropic/claude-opus-4-5", fallback_models: [] },
    },
    misc: {},
  },
  editable: {
    agents: {
      planner: { model: "openai/gpt-4o", fallback_models: [] },
    },
    categories: {
      code: { model: "anthropic/claude-opus-4-5", fallback_models: [] },
    },
    misc: {},
  },
  effective: {
    agents: {
      planner: { model: "openai/gpt-4o", fallback_models: [] },
    },
    categories: {
      code: { model: "anthropic/claude-opus-4-5", fallback_models: [] },
    },
    misc: {},
  },
  readonlyTail: {},
  mtime: 1000,
  errors: [],
  availableModels: [
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "anthropic/claude-opus-4-5",
    "anthropic/claude-haiku-4-5",
  ],
  availableModelGroups: [
    {
      provider: "openai",
      label: "OpenAI",
      models: [
        { id: "openai/gpt-4o", label: "gpt-4o" },
        { id: "openai/gpt-4o-mini", label: "gpt-4o-mini" },
      ],
    },
    {
      provider: "anthropic",
      label: "Anthropic",
      models: [
        { id: "anthropic/claude-opus-4-5", label: "claude-opus-4-5" },
        { id: "anthropic/claude-haiku-4-5", label: "claude-haiku-4-5" },
      ],
    },
  ],
};

test.describe("Grouped Model Picker - Two-Level Cascade", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-cascade", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: mockProfileDetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: 2000 } });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
  });

  test.describe("Agent model picker", () => {
    test("trigger button opens the popover", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");
      await expect(trigger).toBeVisible();

      await trigger.click();

      const popover = page.getByTestId("agent-model-planner-popover");
      await expect(popover).toBeVisible();
    });

    test("popover contains provider pane and model pane only appears on hover", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");
      await trigger.click();

      const providerPane = page.getByTestId("agent-model-planner-provider-pane");
      const modelPane = page.getByTestId("agent-model-planner-model-pane");

      await expect(providerPane).toBeVisible();
      await expect(modelPane).not.toBeVisible();
    });

    test("hovering a provider switches the model pane", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");
      await trigger.click();

      const anthropicProvider = page.getByTestId("agent-model-planner-provider-anthropic");
      await expect(anthropicProvider).toBeVisible();
      await anthropicProvider.hover();

      const claudeModel = page.getByTestId("agent-model-planner-model-anthropic/claude-opus-4-5");
      await expect(claudeModel).toBeVisible();
    });

    test("clicking a model in the pane selects it and closes popover", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");
      await trigger.click();

      const openaiProvider = page.getByTestId("agent-model-planner-provider-openai");
      await openaiProvider.hover();

      const miniModel = page.getByTestId("agent-model-planner-model-openai/gpt-4o-mini");
      await expect(miniModel).toBeVisible();
      await miniModel.click();

      const popover = page.getByTestId("agent-model-planner-popover");
      await expect(popover).not.toBeVisible();

      await expect(trigger).toContainText("gpt-4o-mini");
    });

    test("Escape key closes the popover", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");
      await trigger.click();

      const popover = page.getByTestId("agent-model-planner-popover");
      await expect(popover).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(popover).not.toBeVisible();
    });

    test("trigger has aria-expanded attribute reflecting open state", async ({ page }) => {
      const trigger = page.getByTestId("agent-model-planner-trigger");

      await expect(trigger).toHaveAttribute("aria-expanded", "false");

      await trigger.click();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");

      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  test.describe("Agent fallback model picker (multi-select)", () => {
    test("trigger opens the popover", async ({ page }) => {
      const trigger = page.getByTestId("agent-fallback-planner-trigger");
      await expect(trigger).toBeVisible();

      await trigger.click();

      const popover = page.getByTestId("agent-fallback-planner-popover");
      await expect(popover).toBeVisible();
    });

    test("selecting multiple models keeps the popover open", async ({ page }) => {
      const trigger = page.getByTestId("agent-fallback-planner-trigger");
      await trigger.click();

      const openaiProvider = page.getByTestId("agent-fallback-planner-provider-openai");
      await openaiProvider.hover();

      const miniModel = page.getByTestId("agent-fallback-planner-model-openai/gpt-4o-mini");
      await miniModel.click();

      const popover = page.getByTestId("agent-fallback-planner-popover");
      await expect(popover).toBeVisible();

      const anthropicProvider = page.getByTestId("agent-fallback-planner-provider-anthropic");
      await anthropicProvider.hover();

      const claudeModel = page.getByTestId("agent-fallback-planner-model-anthropic/claude-haiku-4-5");
      await claudeModel.click();

      await expect(popover).toBeVisible();
    });

    test("Escape closes the multi-select popover", async ({ page }) => {
      const trigger = page.getByTestId("agent-fallback-planner-trigger");
      await trigger.click();

      const popover = page.getByTestId("agent-fallback-planner-popover");
      await expect(popover).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(popover).not.toBeVisible();
    });
  });

  test.describe("Category model picker", () => {
    test("trigger button opens the popover", async ({ page }) => {
      const trigger = page.getByTestId("category-model-code-trigger");
      await expect(trigger).toBeVisible();

      await trigger.click();

      const popover = page.getByTestId("category-model-code-popover");
      await expect(popover).toBeVisible();
    });

    test("popover has provider pane and model pane only appears on hover", async ({ page }) => {
      const trigger = page.getByTestId("category-model-code-trigger");
      await trigger.click();

      const providerPane = page.getByTestId("category-model-code-provider-pane");
      const modelPane = page.getByTestId("category-model-code-model-pane");

      await expect(providerPane).toBeVisible();
      await expect(modelPane).not.toBeVisible();
    });

    test("hovering provider switches model pane for category picker", async ({ page }) => {
      const trigger = page.getByTestId("category-model-code-trigger");
      await trigger.click();

      const openaiProvider = page.getByTestId("category-model-code-provider-openai");
      await openaiProvider.hover();

      const gpt4oModel = page.getByTestId("category-model-code-model-openai/gpt-4o");
      await expect(gpt4oModel).toBeVisible();
    });

    test("clicking a model selects it and closes for category (single-select)", async ({ page }) => {
      const trigger = page.getByTestId("category-model-code-trigger");
      await trigger.click();

      const openaiProvider = page.getByTestId("category-model-code-provider-openai");
      await openaiProvider.hover();

      const gpt4oMiniModel = page.getByTestId("category-model-code-model-openai/gpt-4o-mini");
      await gpt4oMiniModel.click();

      const popover = page.getByTestId("category-model-code-popover");
      await expect(popover).not.toBeVisible();

      await expect(trigger).toContainText("gpt-4o-mini");
    });

    test("Escape closes the category model picker", async ({ page }) => {
      const trigger = page.getByTestId("category-model-code-trigger");
      await trigger.click();

      const popover = page.getByTestId("category-model-code-popover");
      await expect(popover).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(popover).not.toBeVisible();
    });
  });

  test.describe("Category fallback model picker (multi-select)", () => {
    test("trigger opens the popover", async ({ page }) => {
      const trigger = page.getByTestId("category-fallback-code-trigger");
      await expect(trigger).toBeVisible();

      await trigger.click();

      const popover = page.getByTestId("category-fallback-code-popover");
      await expect(popover).toBeVisible();
    });

    test("multi-select stays open after selecting fallback models", async ({ page }) => {
      const trigger = page.getByTestId("category-fallback-code-trigger");
      await trigger.click();

      const openaiProvider = page.getByTestId("category-fallback-code-provider-openai");
      await openaiProvider.hover();

      const gpt4oModel = page.getByTestId("category-fallback-code-model-openai/gpt-4o");
      await gpt4oModel.click();

      const popover = page.getByTestId("category-fallback-code-popover");
      await expect(popover).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(popover).not.toBeVisible();
    });
  });
});
