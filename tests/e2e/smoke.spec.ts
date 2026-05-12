import { expect, test } from "@playwright/test";

test("renders bootstrap shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "omo-switch" })).toBeVisible();
});
