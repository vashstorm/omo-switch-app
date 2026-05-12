import { test, expect } from "@playwright/test";

test.describe("Save Flow", () => {
  const mockProfiles = {
    profiles: [
      { id: "profile-1", label: "Profile 1" },
    ]
  };

  const mockProfileDetail = {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: { tmux: { enabled: false } } },
    effective: { agents: {}, categories: {}, misc: { tmux: { enabled: false } } },
    readonlyTail: { foo: "bar" },
    mtime: 1000,
    errors: [],
    availableModels: []
  };

  let mockPutStatus = 200;
  let mockPutResponse: object = { success: true, mtime: 2000 };

  test.beforeEach(async ({ page }) => {
    mockPutStatus = 200;
    mockPutResponse = { success: true, mtime: 2000 };

    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: mockProfileDetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({
          status: mockPutStatus,
          json: mockPutResponse,
        });
      } else {
        await route.continue();
      }
    });
  });

  test("save success, reset, conflict prompt, reload flow", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("misc-section-tmux")).toBeVisible();

    const tmuxCheckbox = page.getByTestId("misc-tmux-enabled-checkbox");
    await expect(tmuxCheckbox).not.toBeChecked();

    await tmuxCheckbox.check();
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("reset-button").click();
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();
    await expect(tmuxCheckbox).not.toBeChecked();

    await tmuxCheckbox.check();
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();

    mockPutStatus = 409;
    mockPutResponse = { success: false, conflict: true, error: "File modified externally" };

    await tmuxCheckbox.uncheck();
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("save-button").click();

    const conflictBanner = page.getByTestId("conflict-banner");
    await expect(conflictBanner).toBeVisible();
    await expect(conflictBanner).toContainText("File modified externally");

    let dialogHandled = false;

    await page.getByTestId("reload-button").click();
    const confirmDialog = page.getByTestId("confirm-dialog");
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    dialogHandled = true;
    await page.getByTestId("confirm-dialog-confirm").click();
    expect(dialogHandled).toBe(true);
    await expect(conflictBanner).not.toBeVisible();
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();
  });
});
