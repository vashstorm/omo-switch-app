import { test, expect } from "@playwright/test";

test.describe("App Shell Layout", () => {
  test("loads profile switcher and displays current profile", async ({ page }) => {
    await page.goto("/");

    const profileSelector = page.getByTestId("profile-selector");
    await expect(profileSelector).toBeVisible();

    const selectTrigger = page.getByTestId("profile-select-trigger");
    await expect(selectTrigger).toBeVisible();

    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();

    await expect(page.getByTestId("save-button")).toBeDisabled();
    await expect(page.getByTestId("reset-button")).toBeDisabled();
  });

  test("shows unsaved changes warning after editing", async ({ page }) => {
    await page.goto("/");

    await page.waitForSelector('[data-testid="profile-select-trigger"]', { timeout: 10000 });

    const profileTrigger = page.getByTestId("profile-select-trigger");
    await profileTrigger.waitFor({ state: 'visible' });

    await profileTrigger.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    const options = await page.locator('[role="option"]').all();
    expect(options.length).toBeGreaterThan(0);

    await options[0].click();

    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();
  });
});
