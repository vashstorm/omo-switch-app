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
  let putCount = 0;
  let lastPutBody: any = null;

  test.beforeEach(async ({ page }) => {
    mockPutStatus = 200;
    mockPutResponse = { success: true, mtime: 2000 };
    putCount = 0;
    lastPutBody = null;

    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-1", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: mockProfileDetail });
      } else if (route.request().method() === "PUT") {
        putCount += 1;
        lastPutBody = route.request().postDataJSON();
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

    const tmuxEditor = page.getByTestId("misc-tmux-value-json");
    await expect(tmuxEditor).toHaveValue(/"enabled": false/);

    await tmuxEditor.fill('{ "enabled": true }');
    await tmuxEditor.blur();
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("reset-button").click();
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();
    await expect(tmuxEditor).toHaveValue(/"enabled": false/);

    await tmuxEditor.fill('{ "enabled": true }');
    await tmuxEditor.blur();
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });
    await expect(page.getByTestId("unsaved-warning")).not.toBeVisible();

    mockPutStatus = 409;
    mockPutResponse = { success: false, code: "CONFLICT", message: "File modified externally" };

    await tmuxEditor.fill('{ "enabled": false }');
    await tmuxEditor.blur();
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

  test("save validates misc JSON drafts before sending request", async ({ page }) => {
    await page.goto("/");

    const tmuxEditor = page.getByTestId("misc-tmux-value-json");
    await expect(tmuxEditor).toBeVisible();

    await tmuxEditor.fill('{ "enabled": ');
    await expect(page.getByTestId("unsaved-warning")).toBeVisible();
    await page.getByTestId("save-button").click();

    await expect(page.getByTestId("toast-error")).toContainText("Misc Configuration contains invalid JSON");
    expect(putCount).toBe(0);

    await tmuxEditor.fill('{ "enabled": true }');
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });

    expect(putCount).toBe(1);
    expect(lastPutBody.payload.misc.tmux).toEqual({ enabled: true });
  });

  test("save persists misc create and delete operations", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("misc-add-open").click();
    await page.getByTestId("misc-create-name").fill("custom_setting");
    await page.getByTestId("misc-create-value-json").fill('{ "mode": "fast" }');
    await page.getByTestId("misc-create-submit").click();

    await expect(page.getByTestId("misc-section-custom_setting")).toBeVisible();
    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });
    expect(lastPutBody.payload.misc.custom_setting).toEqual({ mode: "fast" });

    await page.getByTestId("delete-misc-tmux").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByTestId("misc-section-tmux")).toHaveCount(0);

    await page.getByTestId("save-button").click();
    await expect(page.getByTestId("status-success")).toHaveText("Saved successfully", { timeout: 10000 });
    expect(lastPutBody.payload.misc.tmux).toBeNull();
  });
});
