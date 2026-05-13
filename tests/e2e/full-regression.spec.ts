import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function selectAgentVariant(page: Page, agentId: string, variant: string) {
  await page.getByTestId(`agent-variant-${agentId}`).click();
  await page.getByRole("option", { name: variant || "Default" }).click();
}

async function expectAgentVariant(page: Page, agentId: string, variant: string) {
  await expect(page.getByTestId(`agent-variant-${agentId}`)).toContainText(variant || "Default");
}

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
    await expect(modelSelectA).toContainText("gpt-4");

    await selectAgentVariant(page, "planner", "medium");
    await page.getByTestId("agent-prompt-planner").fill("profile A local edit");

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
    await expect(modelSelectB).toContainText("claude-3");
    await expectAgentVariant(page, "planner", "high");

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

    await selectAgentVariant(page, "planner", "");

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

    await selectAgentVariant(page, "planner", "high");

    const saveButton = page.getByTestId("save-button");
    await saveButton.click();

    await expect(page.getByTestId("conflict-banner")).toBeVisible();
    const conflictBanner = page.getByTestId("conflict-banner");
    await expect(conflictBanner).toContainText("File modified externally");

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
