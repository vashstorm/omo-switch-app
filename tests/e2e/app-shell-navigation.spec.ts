import { test, expect } from "@playwright/test";

test.describe("App Shell Navigation", () => {
  const mockProfiles = {
    profiles: [{ id: "default", label: "Default" }],
  };

  const mockProfileDetail = {
    baseline: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: {},
    },
    editable: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: {},
    },
    effective: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: { tmux: { enabled: true } },
    },
    readonlyTail: { version: 1 },
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4"],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });
    await page.route("**/api/profiles/default", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: mockProfileDetail });
      } else {
        await route.continue();
      }
    });
  });

  test("three top-level nav links are visible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-link-agents")).toBeVisible();
    await expect(page.getByTestId("nav-link-categories")).toBeVisible();
    await expect(page.getByTestId("nav-link-misc")).toBeVisible();
  });

  test("header actions profile-selector, save-button, reset-button remain visible", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("profile-selector")).toBeVisible();
    await expect(page.getByTestId("save-button")).toBeVisible();
    await expect(page.getByTestId("reset-button")).toBeVisible();
  });

  test("clicking nav-link-categories scrolls to categories section", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-link-categories").click();

    await expect(page.getByTestId("categories-section")).toBeInViewport({ timeout: 3000 });
  });

  test("clicking nav-link-agents scrolls to agents section", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("nav-link-agents").click();

    await expect(page.getByTestId("agents-section")).toBeInViewport({ timeout: 3000 });
  });

  test("nav sub-items rendered for agents and categories", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("nav-link-agent-build")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("nav-link-agent-oracle")).toBeVisible();
    await expect(page.getByTestId("nav-link-category-deep")).toBeVisible();
  });

  test("clicking raw-config-open button opens raw config modal", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("raw-config-open").click();

    await expect(page.getByTestId("raw-config-modal")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("raw-config-content")).toBeVisible();
  });
});
