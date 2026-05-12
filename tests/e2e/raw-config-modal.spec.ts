import { test, expect } from "@playwright/test";

test.describe("Raw Configuration Modal E2E", () => {
  const mockProfiles = {
    profiles: [{ id: "default", label: "Default" }],
  };

  const mockProfileDetail = {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: { version: 42, source: "config.jsonc" },
    mtime: 1000,
    errors: [],
    availableModels: [],
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

  test("clicking raw config button opens modal with JSON content", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("raw-config-open").click();

    const modal = page.getByTestId("raw-config-modal");
    await expect(modal).toBeVisible({ timeout: 3000 });

    const content = page.getByTestId("raw-config-content");
    await expect(content).toBeVisible();
    await expect(content).toContainText("42");
    await expect(content).toContainText("config.jsonc");
  });

  test("pressing Escape closes the modal", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("raw-config-open").click();
    await expect(page.getByTestId("raw-config-modal")).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");

    await expect(page.getByTestId("raw-config-modal")).not.toBeVisible({ timeout: 3000 });
  });

  test("clicking close button closes the modal", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("raw-config-open").click();
    await expect(page.getByTestId("raw-config-modal")).toBeVisible({ timeout: 3000 });

    await page.getByTestId("raw-config-close").click();

    await expect(page.getByTestId("raw-config-modal")).not.toBeVisible({ timeout: 3000 });
  });

  test("inline readonly-tail-panel does not exist on page", async ({ page }) => {
    await page.goto("/");

    const count = await page.getByTestId("readonly-tail-panel").count();
    expect(count).toBe(0);
  });
});
