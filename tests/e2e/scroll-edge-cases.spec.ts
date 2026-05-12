import { test, expect } from "@playwright/test";
import type { ProfileConfigResult } from "../../src/web/hooks/useProfile";
import { overflowProfileDetail, overflowMockProfiles } from "../fixtures/overflow-profile";

const emptyProfileDetail = {
  baseline: { agents: {}, categories: {}, misc: {} },
  editable: { agents: {}, categories: {}, misc: {} },
  effective: { agents: {}, categories: {}, misc: {} },
  readonlyTail: {},
  rawMisc: {},
  mtime: 1,
  errors: [],
  availableModels: [],
  availableModelGroups: [],
  disabledProviders: [],
  providerCatalog: [],
} satisfies ProfileConfigResult;

const emptyMockProfiles = {
  profiles: [{ id: "empty-profile", label: "Empty Test Profile" }],
};

test.describe("Scroll Edge Cases", () => {
  test.describe("Collapsed State", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/profiles", async (route) => {
        await route.fulfill({ json: overflowMockProfiles });
      });
      await page.route("**/api/profiles/overflow-profile", async (route) => {
        await route.fulfill({ json: overflowProfileDetail });
      });
      await page.goto("/");
      await page.waitForSelector('[data-testid="agents-section"]');
    });

    test("sections still reachable when all collapsed", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.locator('[data-testid="toggle-section-agents"]').click();
      await page.locator('[data-testid="toggle-section-categories"]').click();
      await page.locator('[data-testid="toggle-section-misc"]').click();

      await page.locator('[data-testid="agents-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="agents-section"]')).toBeVisible();

      await page.locator('[data-testid="categories-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="categories-section"]')).toBeVisible();

      await page.locator('[data-testid="misc-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="misc-section"]')).toBeVisible();
    });
  });

  test.describe("Empty State", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/profiles", async (route) => {
        await route.fulfill({ json: emptyMockProfiles });
      });
      await page.route("**/api/profiles/empty-profile", async (route) => {
        await route.fulfill({ json: emptyProfileDetail });
      });
      await page.goto("/");
      await page.waitForSelector('[data-testid="agents-section"]');
    });

    test("minimal data does not break scroll", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });

      await page.locator('[data-testid="agents-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="agents-section"]')).toBeVisible();

      await page.locator('[data-testid="categories-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="categories-section"]')).toBeVisible();

      await page.locator('[data-testid="misc-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="misc-section"]')).toBeVisible();
    });
  });

  test.describe("Resize", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/profiles", async (route) => {
        await route.fulfill({ json: overflowMockProfiles });
      });
      await page.route("**/api/profiles/overflow-profile", async (route) => {
        await route.fulfill({ json: overflowProfileDetail });
      });
      await page.goto("/");
      await page.waitForSelector('[data-testid="agents-section"]');
    });

    test("resize from 1440 to 1024 does not reintroduce clipping", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForSelector('[data-testid="agents-section"]');

      await page.setViewportSize({ width: 1024, height: 768 });

      await page.locator('[data-testid="agents-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="agents-section"]')).toBeVisible();

      await page.locator('[data-testid="categories-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="categories-section"]')).toBeVisible();

      await page.locator('[data-testid="misc-section"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[data-testid="misc-section"]')).toBeVisible();
    });
  });
});
