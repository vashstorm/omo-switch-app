import { test, expect } from "@playwright/test";
import { overflowProfileDetail, overflowMockProfiles } from "../fixtures/overflow-profile";

test.describe("Scroll Reachability Regression", () => {
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

  test("all sections reachable at 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Verify overflow exists (content exceeds container height)
    const hasOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return false;
      return main.scrollHeight > main.clientHeight;
    });
    expect(hasOverflow).toBe(true);

    await page.locator('[data-testid="agents-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="agents-section"]')).toBeVisible();

    await page.locator('[data-testid="categories-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="categories-section"]')).toBeVisible();

    await page.locator('[data-testid="misc-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="misc-section"]')).toBeVisible();

    // Verify last agent card is reachable (scroll works)
    const lastAgentCard = page.locator('[data-testid="agent-card-documenter"]');
    await lastAgentCard.scrollIntoViewIfNeeded();
    await expect(lastAgentCard).toBeVisible();
  });

  test("all sections reachable at 1280x720", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Verify overflow exists (content exceeds container height)
    const hasOverflow = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return false;
      return main.scrollHeight > main.clientHeight;
    });
    expect(hasOverflow).toBe(true);

    await page.locator('[data-testid="agents-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="agents-section"]')).toBeVisible();

    await page.locator('[data-testid="categories-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="categories-section"]')).toBeVisible();

    await page.locator('[data-testid="misc-section"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-testid="misc-section"]')).toBeVisible();

    // Verify last agent card is reachable (scroll works)
    const lastAgentCard = page.locator('[data-testid="agent-card-documenter"]');
    await lastAgentCard.scrollIntoViewIfNeeded();
    await expect(lastAgentCard).toBeVisible();
  });

  test("main is the scroll container not document body", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const scrollContract = await page.evaluate(() => {
      const main = document.querySelector("main");
      const body = document.body;
      const html = document.documentElement;
      return {
        mainOverflowY: main ? window.getComputedStyle(main).overflowY : null,
        bodyOverflowY: window.getComputedStyle(body).overflowY,
        htmlOverflowY: window.getComputedStyle(html).overflowY,
        windowScrollY: window.scrollY,
      };
    });

    expect(scrollContract.mainOverflowY).toMatch(/^(auto|scroll)$/);
    expect(scrollContract.bodyOverflowY).not.toMatch(/^(auto|scroll)$/);
    expect(scrollContract.htmlOverflowY).not.toMatch(/^(auto|scroll)$/);
    expect(scrollContract.windowScrollY).toBe(0);
  });
});
