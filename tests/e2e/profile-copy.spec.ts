import { test, expect } from "@playwright/test";

test.describe("Profile Copy Flow", () => {
  const mockProfiles = {
    profiles: [{ id: "default", label: "Default" }],
  };

  const mockProfileDetail = {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: { version: 1 },
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

  test("opens copy dialog and shows name input", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("copy-profile-button")).toBeVisible();

    await page.getByTestId("copy-profile-button").click();

    await expect(page.getByTestId("copy-profile-dialog")).toBeVisible();
    await expect(page.getByTestId("copy-profile-name-input")).toBeVisible();
    await expect(page.getByTestId("copy-profile-submit")).toBeDisabled();
  });

  test("cancel button closes copy dialog", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("copy-profile-button").click();
    await expect(page.getByTestId("copy-profile-dialog")).toBeVisible();

    await page.getByTestId("copy-profile-cancel").click();
    await expect(page.getByTestId("copy-profile-dialog")).not.toBeVisible();
  });

  test("successful copy shows toast-success and switches to new profile", async ({ page }) => {
    const updatedProfiles = {
      profiles: [
        { id: "default", label: "Default" },
        { id: "copy-ui-smoke", label: "copy-ui-smoke" },
      ],
    };
    const newProfileDetail = { ...mockProfileDetail };

    await page.route("**/api/profiles/default/copy", async (route) => {
      await route.fulfill({
        status: 200,
        json: { profile: { id: "copy-ui-smoke", label: "copy-ui-smoke" } },
      });
    });

    let copyDone = false;
    await page.route("**/api/profiles", async (route) => {
      if (copyDone) {
        await route.fulfill({ json: updatedProfiles });
      } else {
        await route.fulfill({ json: mockProfiles });
      }
    });

    await page.route("**/api/profiles/copy-ui-smoke", async (route) => {
      await route.fulfill({ json: newProfileDetail });
    });

    await page.goto("/");
    await page.getByTestId("copy-profile-button").click();
    await page.getByTestId("copy-profile-name-input").fill("copy-ui-smoke");
    await expect(page.getByTestId("copy-profile-submit")).toBeEnabled();

    copyDone = true;
    await page.getByTestId("copy-profile-submit").click();

    await expect(page.getByTestId("toast-success")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("copy-profile-dialog")).not.toBeVisible();
  });

  test("duplicate target name shows toast-error without closing dialog", async ({ page }) => {
    await page.route("**/api/profiles/default/copy", async (route) => {
      await route.fulfill({
        status: 409,
        json: { error: "Profile already exists" },
      });
    });

    await page.goto("/");
    await page.getByTestId("copy-profile-button").click();
    await page.getByTestId("copy-profile-name-input").fill("copy-ui-smoke");
    await page.getByTestId("copy-profile-submit").click();

    await expect(page.getByTestId("toast-error")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("copy-profile-dialog")).toBeVisible();
  });
});
