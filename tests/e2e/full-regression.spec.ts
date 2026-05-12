import { test, expect } from "@playwright/test";

test.describe("Full Regression Suite", () => {
  const profileADetail = {
    baseline: {
      agents: {
        planner: { model: "gpt-4" },
      },
      categories: {},
      misc: {},
    },
    editable: {
      agents: {
        planner: { model: "gpt-4", variant: "low" },
      },
      categories: {},
      misc: {},
    },
    effective: {
      agents: {
        planner: { model: "gpt-4", variant: "low" },
      },
      categories: {},
      misc: {},
    },
    readonlyTail: {},
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4"],
  };

  const profileBDetail = {
    baseline: {
      agents: {
        planner: { model: "claude-3" },
      },
      categories: {},
      misc: {},
    },
    editable: {
      agents: {
        planner: { model: "claude-3", variant: "high" },
      },
      categories: {},
      misc: {},
    },
    effective: {
      agents: {
        planner: { model: "claude-3", variant: "high" },
      },
      categories: {},
      misc: {},
    },
    readonlyTail: {},
    mtime: 2000,
    errors: [],
    availableModels: ["claude-3"],
  };

  const mockProfiles = {
    profiles: [
      { id: "profile-a", label: "Profile A" },
      { id: "profile-b", label: "Profile B" },
    ],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileADetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/profiles/profile-b", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileBDetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });
  });

  test("multi-profile switching without cross-contamination", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("agent-editor")).toBeVisible();

    const modelSelectA = page.getByTestId("agent-model-planner");
    await expect(modelSelectA).toHaveValue("gpt-4");

    const variantSelectA = page.getByTestId("agent-variant-planner");
    await variantSelectA.selectOption("medium");

    const saveButton = page.getByTestId("save-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const successMsg = page.getByTestId("status-success");
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toContainText("Saved successfully");

    const profileSelector = page.getByTestId("profile-select-trigger");
    await profileSelector.click();
    await page.getByTestId("profile-option-profile-b").click();

    await expect(page.getByTestId("agent-editor")).toBeVisible();

    const modelSelectB = page.getByTestId("agent-model-planner");
    await expect(modelSelectB).toHaveValue("claude-3");
    const variantSelectB = page.getByTestId("agent-variant-planner");
    await expect(variantSelectB).toHaveValue("high");

    await profileSelector.click();
    await page.getByTestId("profile-option-profile-a").click();

    await expect(page.getByTestId("agent-editor")).toBeVisible();
  });

  test("empty optional field omission", async ({ page }) => {
    const profileWithOptionalFields = {
      baseline: {
        agents: {
          planner: { model: "gpt-4" },
        },
        categories: {},
        misc: {},
      },
      editable: {
        agents: {
          planner: {
            model: "gpt-4",
            variant: "low",
            temperature: 0.7,
            prompt_append: "custom prompt",
          },
        },
        categories: {},
        misc: {},
      },
      effective: {
        agents: {
          planner: {
            model: "gpt-4",
            variant: "low",
            temperature: 0.7,
            prompt_append: "custom prompt",
          },
        },
        categories: {},
        misc: {},
      },
      readonlyTail: {},
      mtime: 1000,
      errors: [],
      availableModels: ["gpt-4"],
    };

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileWithOptionalFields });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("agent-editor")).toBeVisible();

    const variantSelect = page.getByTestId("agent-variant-planner");
    await variantSelect.selectOption("");

    const temperatureInput = page.getByTestId("agent-temperature-planner");
    await temperatureInput.fill("");

    const promptInput = page.getByTestId("agent-prompt-planner");
    await promptInput.fill("");

    const saveButton = page.getByTestId("save-button");
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const successMsg = page.getByTestId("status-success");
    await expect(successMsg).toBeVisible();
  });

  test("conflict recovery - external modification detection", async ({ page }) => {
    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileADetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 409,
          json: {
            error: "CONFLICT",
            message: "File modified externally. Please reload.",
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await expect(page.getByTestId("agent-editor")).toBeVisible();

    const variantSelect = page.getByTestId("agent-variant-planner");
    await variantSelect.selectOption("high");

    const saveButton = page.getByTestId("save-button");
    await saveButton.click();

    await expect(page.getByTestId("conflict-banner")).toBeVisible();
    const conflictBanner = page.getByTestId("conflict-banner");
    await expect(conflictBanner).toContainText("CONFLICT");

    const reloadButton = page.getByTestId("reload-button");
    await expect(reloadButton).toBeVisible();

    const updatedProfile = {
      ...profileADetail,
      editable: {
        agents: {
          planner: { model: "gpt-4", variant: "medium" },
        },
        categories: {},
        misc: {},
      },
      mtime: 3000,
    };

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: updatedProfile });
      } else {
        await route.continue();
      }
    });

    await reloadButton.click();

    await expect(page.getByTestId("agent-editor")).toBeVisible();
    const variantAfterReload = page.getByTestId("agent-variant-planner");
    await expect(variantAfterReload).toBeVisible();
  });
});
