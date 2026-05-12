import { test, expect } from "@playwright/test";

test.describe("Sync Replace Flow", () => {
  const mockProfiles = {
    profiles: [
      { id: "profile-1", label: "Profile 1" },
    ]
  };

  // Base profile with 2 agents and 1 category, all using "openai/gpt-4"
  const createMockProfileDetail = () => ({
    baseline: {
      agents: {},
      categories: {},
      misc: {}
    },
    editable: {
      agents: {
        "agent-a": { model: "openai/gpt-4" },
        "agent-b": { model: "openai/gpt-4" },
      },
      categories: {
        "category-x": { model: "openai/gpt-4" },
      },
      misc: {}
    },
    effective: {
      agents: {
        "agent-a": { model: "openai/gpt-4" },
        "agent-b": { model: "openai/gpt-4" },
      },
      categories: {
        "category-x": { model: "openai/gpt-4" },
      },
      misc: {}
    },
    readonlyTail: {},
    mtime: 1000,
    errors: [],
    availableModels: ["openai/gpt-4", "openai/gpt-5"]
  });

  // Profile with 1 agent and 2 categories for category sync replace test
  const createCategoryTestProfileDetail = () => ({
    baseline: {
      agents: {},
      categories: {},
      misc: {}
    },
    editable: {
      agents: {
        "agent-a": { model: "openai/gpt-4" },
      },
      categories: {
        "category-x": { model: "openai/gpt-4" },
        "category-y": { model: "openai/gpt-4" },
      },
      misc: {}
    },
    effective: {
      agents: {
        "agent-a": { model: "openai/gpt-4" },
      },
      categories: {
        "category-x": { model: "openai/gpt-4" },
        "category-y": { model: "openai/gpt-4" },
      },
      misc: {}
    },
    readonlyTail: {},
    mtime: 1000,
    errors: [],
    availableModels: ["openai/gpt-4", "openai/gpt-5"]
  });

  let capturedPutBody: object | null = null;

  test.beforeEach(async ({ page }) => {
    capturedPutBody = null;

    // Mock profiles list
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });
  });

  test("loads persisted sync replace preference", async ({ page }) => {
    // Mock global config with syncReplaceEnabled: true
    await page.route("**/api/config/global", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { syncReplaceEnabled: true } });
      } else {
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    // Mock profile detail
    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: createMockProfileDetail() });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    // Wait for page to load and select the profile
    await page.waitForTimeout(500);

    // Select profile from dropdown
    const profileSelect = page.locator('role=combobox').first();
    await profileSelect.click();
    await page.locator('role=option', { hasText: 'Profile 1' }).click();

    // Wait for profile to load
    await expect(page.getByTestId("agents-section")).toBeVisible();

    // Assert sync-replace-toggle switch is checked (data-testid is on the input inside the Switch)
    // The switch is inside a FormControlLabel, we need to find the switch by its label text
    const toggle = page.locator('role=switch');
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeChecked();
  });

  test("confirms sync replace and saves updated payload", async ({ page }) => {
    // Mock global config with syncReplaceEnabled: true
    await page.route("**/api/config/global", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { syncReplaceEnabled: true } });
      } else {
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    // Mock profile detail
    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: createMockProfileDetail() });
      } else if (route.request().method() === "PUT") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        capturedPutBody = body;
        await route.fulfill({
          status: 200,
          json: { success: true, mtime: 2000 },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    // Wait for page to load and select the profile
    await page.waitForTimeout(500);

    // Select profile from dropdown
    const profileSelect = page.locator('role=combobox').first();
    await profileSelect.click();
    await page.locator('role=option', { hasText: 'Profile 1' }).click();

    // Wait for agents section to be visible
    await expect(page.getByTestId("agents-section")).toBeVisible();

    // Wait for agent cards to appear
    await expect(page.locator('[data-testid="agent-card-agent-a"]')).toBeVisible();

    // Expand agent-a card if collapsed
    const toggleAgentA = page.locator('[data-testid="toggle-agent-agent-a"]');
    await toggleAgentA.click();

    // Find the model selector for agent-a and change it
    const modelSelect = page.locator('[data-testid="agent-model-agent-a"]');
    await expect(modelSelect).toBeVisible();

    // Open the select dropdown
    await modelSelect.click();

    // Select "openai/gpt-5" option
    const option = page.locator('[role="option"]:has-text("openai/gpt-5")');
    await expect(option).toBeVisible();
    await option.click();

    // Assert: preview dialog appears
    const previewDialog = page.locator('[data-testid="sync-replace-preview-dialog"]');
    await expect(previewDialog).toBeVisible();

    // Assert: preview dialog shows the additional affected agents/categories
    // The dialog should show agent-b and category-x (NOT agent-a which is the trigger)
    await expect(previewDialog).toContainText("agent-b");
    await expect(previewDialog).toContainText("category-x");

    // User clicks confirm
    await page.getByTestId("sync-replace-confirm").click();

    // Assert: dialog closes
    await expect(previewDialog).not.toBeVisible();

    // Assert: unsaved-warning visible (isDirty=true)
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();

    // User clicks save
    await page.getByTestId("save-button").click();

    // Assert: PUT payload contains updated agents.*.model = "openai/gpt-5" for ALL agents
    // and categories.*.model = "openai/gpt-5"
    await expect.poll(() => capturedPutBody).not.toBeNull();

    // The PUT body structure is { payload: { agents, categories, misc }, expectedMtime }
    const putBody = capturedPutBody as any;
    const payload = putBody.payload;
    expect(payload.agents["agent-a"].model).toBe("openai/gpt-5");
    expect(payload.agents["agent-b"].model).toBe("openai/gpt-5");
    expect(payload.categories["category-x"].model).toBe("openai/gpt-5");

    // Assert: success message appears
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });
  });

  test("cancels category sync replace and restores original value", async ({ page }) => {
    // Mock global config with syncReplaceEnabled: true
    await page.route("**/api/config/global", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { syncReplaceEnabled: true } });
      } else {
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    // Mock profile detail with 1 agent and 2 categories
    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: createCategoryTestProfileDetail() });
      } else if (route.request().method() === "PUT") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        capturedPutBody = body;
        await route.fulfill({
          status: 200,
          json: { success: true, mtime: 2000 },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    // Wait for page to load and select the profile
    await page.waitForTimeout(500);

    // Select profile from dropdown
    const profileSelect = page.locator('role=combobox').first();
    await profileSelect.click();
    await page.locator('role=option', { hasText: 'Profile 1' }).click();

    // Wait for categories section to be visible
    await expect(page.getByTestId("categories-section")).toBeVisible();

    // Wait for category cards to appear
    await expect(page.locator('[data-testid="category-card-category-x"]')).toBeVisible();

    // Expand category-x card
    const toggleCategoryX = page.locator('[data-testid="toggle-category-category-x"]');
    await toggleCategoryX.click();

    // Find the model selector for category-x and change it
    const modelSelect = page.locator('[data-testid="category-model-category-x"]');
    await expect(modelSelect).toBeVisible();

    // Open the select dropdown
    await modelSelect.click();

    // Select "openai/gpt-5" option
    const option = page.locator('[role="option"]:has-text("openai/gpt-5")');
    await expect(option).toBeVisible();
    await option.click();

    // Assert: preview dialog appears
    const previewDialog = page.locator('[data-testid="sync-replace-preview-dialog"]');
    await expect(previewDialog).toBeVisible();

    // Assert: preview dialog shows the additional affected category (category-y)
    await expect(previewDialog).toContainText("category-y");

    // User clicks cancel
    await page.getByTestId("sync-replace-cancel").click();

    // Assert: dialog closes
    await expect(previewDialog).not.toBeVisible();

    // Assert: unsaved-warning NOT visible (no dirty state produced if nothing else changed)
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();

    // Verify the model was restored to original value - check the combobox value attribute
    // The select shows both the label and value, so we check the input value
    const modelSelectAfterCancel = page.locator('[data-testid="category-model-category-x"] input');
    await expect(modelSelectAfterCancel).toHaveValue("openai/gpt-4");
  });

  test("sync replace off: only updates current agent without showing dialog", async ({ page }) => {
    // Mock global config with syncReplaceEnabled: false
    await page.route("**/api/config/global", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: { syncReplaceEnabled: false } });
      } else {
        await route.fulfill({ status: 200, json: { success: true } });
      }
    });

    // Mock profile detail with 2 agents
    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: createMockProfileDetail() });
      } else if (route.request().method() === "PUT") {
        const body = JSON.parse(route.request().postData() ?? "{}");
        capturedPutBody = body;
        await route.fulfill({
          status: 200,
          json: { success: true, mtime: 2000 },
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/");

    // Wait for page to load and select the profile
    await page.waitForTimeout(500);

    // Select profile from dropdown
    const profileSelect = page.locator('role=combobox').first();
    await profileSelect.click();
    await page.locator('role=option', { hasText: 'Profile 1' }).click();

    // Wait for agents section to be visible
    await expect(page.getByTestId("agents-section")).toBeVisible();

    // Wait for agent cards to appear
    await expect(page.locator('[data-testid="agent-card-agent-a"]')).toBeVisible();

    // Expand agent-a card
    const toggleAgentA = page.locator('[data-testid="toggle-agent-agent-a"]');
    await toggleAgentA.click();

    // Find the model selector for agent-a and change it
    const modelSelect = page.locator('[data-testid="agent-model-agent-a"]');
    await expect(modelSelect).toBeVisible();

    // Open the select dropdown
    await modelSelect.click();

    // Select "openai/gpt-5" option
    const option = page.locator('[role="option"]:has-text("openai/gpt-5")');
    await expect(option).toBeVisible();
    await option.click();

    // Assert: preview dialog does NOT appear
    const previewDialog = page.locator('[data-testid="sync-replace-preview-dialog"]');
    await expect(previewDialog).not.toBeVisible();

    // Assert: unsaved-warning visible (isDirty=true from the single change)
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();

    // Save and verify only agent-a was updated
    await page.getByTestId("save-button").click();

    await expect.poll(() => capturedPutBody).not.toBeNull();

    // The PUT body structure is { payload: { agents, categories, misc }, expectedMtime }
    const putBody = capturedPutBody as any;
    const payload = putBody.payload;
    expect(payload.agents["agent-a"].model).toBe("openai/gpt-5");
    // agent-b should still have the original model
    expect(payload.agents["agent-b"].model).toBe("openai/gpt-4");
  });
});
