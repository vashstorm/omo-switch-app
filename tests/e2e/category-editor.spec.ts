import { test, expect } from "@playwright/test";

test.describe("Category Editor E2E", () => {
  const mockProfiles = {
    profiles: [{ id: "profile-1", label: "Profile 1" }],
  };

  const mockProfileDetail = {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: { foo: "bar" },
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4o", "gpt-4o-mini", "claude-haiku-4-5"],
  };

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: mockProfileDetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: 2000 } });
      } else {
        await route.continue();
      }
    });
  });

  test("adds a category via nav dialog and saves", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("categories-section")).toBeVisible();

    await page.getByTestId("nav-add-category-btn").click();
    await page.getByTestId("new-category-id-input").fill("e2e-cat");
    await page.getByTestId("create-category-submit").click();

    await expect(page.getByTestId("category-card-e2e-cat")).toBeVisible();

    const saveBtn = page.getByTestId("save-button");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.getByTestId("status-success")).toBeVisible();
  });
});
