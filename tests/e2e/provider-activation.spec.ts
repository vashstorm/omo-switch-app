import { test, expect } from "@playwright/test";
import { groupModelsByProvider } from "../../src/shared/model-catalog";

const mockProfiles = {
  profiles: [{ id: "profile-1", label: "Profile 1" }],
};

const allAvailableModels = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-opus-4-5",
  "anthropic/claude-sonnet-4-5",
  "google/gemini-2.5-pro",
];

const allModelGroups = groupModelsByProvider(allAvailableModels);

function buildProfileDetail(disabledProviders: string[]) {
  const filteredModels = allAvailableModels.filter((modelId) => {
    const provider = modelId.split("/")[0];
    return !disabledProviders.includes(provider);
  });

  return {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: {},
    rawMisc: {},
    mtime: 1000,
    errors: [],
    availableModels: filteredModels,
    availableModelGroups: groupModelsByProvider(filteredModels),
    disabledProviders,
    providerCatalog: ["openai", "anthropic", "google"],
  };
}

test.describe("Provider Activation Lifecycle", () => {
  let profileDetail = buildProfileDetail([]);
  let lastPutBody: { disabledProviders: string[] } | null = null;

  test.beforeEach(async ({ page }) => {
    profileDetail = buildProfileDetail([]);
    lastPutBody = null;

    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileDetail });
      } else if (route.request().method() === "PUT") {
        const url = route.request().url();
        if (url.includes("/disabled-providers")) {
          const body = await route.request().postDataJSON();
          lastPutBody = body;
          profileDetail = buildProfileDetail(body.disabledProviders);
          await route.fulfill({ json: profileDetail });
        } else {
          await route.fulfill({ json: { success: true, mtime: 2000 } });
        }
      } else {
        await route.continue();
      }
    });

    await page.route("**/api/config/global", async (route) => {
      await route.fulfill({ json: { syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null } });
    });
  });

  test("disable provider hides models from picker, persists on refresh, re-enable restores", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid="agents-section"]', { state: "visible" });

    const modelTrigger = page.locator('[data-testid="agent-model-planner-trigger"]').first();
    await expect(modelTrigger).toBeVisible({ timeout: 10000 });
    await modelTrigger.click();
    await expect(page.locator('[data-testid="agent-model-planner-provider-openai"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-anthropic"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-google"]')).toBeVisible();

    await page.keyboard.press("Escape");

    const providerButton = page.locator('[data-testid="provider-activation-button"]').first();
    await expect(providerButton).toBeVisible();
    await providerButton.click();

    await expect(page.locator('[data-testid="provider-activation-item-openai"]')).toBeVisible();

    const openaiSwitch = page.locator('[data-testid="provider-activation-item-openai"] input[type="checkbox"]');
    await expect(openaiSwitch).toBeChecked();
    await openaiSwitch.click();

    await expect.poll(() => lastPutBody).toEqual({ disabledProviders: ["openai"] });

    await page.keyboard.press("Escape");

    await modelTrigger.click();
    await expect(page.locator('[data-testid="agent-model-planner-provider-openai"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-anthropic"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-google"]')).toBeVisible();

    await page.keyboard.press("Escape");

    profileDetail = buildProfileDetail(["openai"]);
    await page.reload();
    await page.waitForSelector('[data-testid="agents-section"]', { state: "visible" });

    await modelTrigger.click();
    await expect(page.locator('[data-testid="agent-model-planner-provider-openai"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-anthropic"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-google"]')).toBeVisible();

    await page.keyboard.press("Escape");

    const providerButtonAfterRefresh = page.locator('[data-testid="provider-activation-button"]').first();
    await providerButtonAfterRefresh.click();

    await expect(page.locator('[data-testid="provider-activation-item-openai"]')).toBeVisible();
    const openaiSwitchAfterRefresh = page.locator('[data-testid="provider-activation-item-openai"] input[type="checkbox"]');
    await expect(openaiSwitchAfterRefresh).not.toBeChecked();
    await openaiSwitchAfterRefresh.click();

    await expect.poll(() => lastPutBody).toEqual({ disabledProviders: [] });

    await page.keyboard.press("Escape");

    await modelTrigger.click();
    await expect(page.locator('[data-testid="agent-model-planner-provider-openai"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-anthropic"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-model-planner-provider-google"]')).toBeVisible();
  });

  test("all providers disabled shows empty state in picker", async ({ page }) => {
    profileDetail = buildProfileDetail(["openai", "anthropic", "google"]);

    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileDetail });
      } else if (route.request().method() === "PUT") {
        const url = route.request().url();
        if (url.includes("/disabled-providers")) {
          const body = await route.request().postDataJSON();
          lastPutBody = body;
          profileDetail = buildProfileDetail(body.disabledProviders);
          await route.fulfill({ json: profileDetail });
        } else {
          await route.fulfill({ json: { success: true, mtime: 2000 } });
        }
      } else {
        await route.continue();
      }
    });

    await page.goto("/");
    await page.waitForSelector('[data-testid="agents-section"]', { state: "visible" });

    const emptyState = page.locator('[data-testid="agent-model-planner-empty-state"]').first();
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("No enabled providers for this profile");
  });
});
