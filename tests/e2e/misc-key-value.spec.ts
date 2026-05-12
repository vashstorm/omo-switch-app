import { test, expect } from "@playwright/test";

test.describe("Misc Key-Value Display", () => {
  const mockProfiles = {
    profiles: [{ id: "default", label: "Default" }],
  };

  const mockProfileDetail = {
    baseline: {
      agents: {},
      categories: {},
      misc: { tmux: { enabled: true } },
    },
    editable: {
      agents: {},
      categories: {},
      misc: { tmux: { enabled: true } },
    },
    effective: {
      agents: {},
      categories: {},
      misc: {
        tmux: { enabled: true, prefix_key: "Ctrl+B", nested: { key: "value" } },
        git_master: { enabled: false, max_depth: 5 },
      },
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

  test("misc section shows managed field as editable checkbox", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-tmux-enabled-checkbox']", { timeout: 5000 });
    const checkbox = page.getByTestId("misc-tmux-enabled-checkbox");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toHaveAttribute("type", "checkbox");
  });

  test("misc section shows non-managed string as read-only", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-kv-tmux-prefix_key-readonly']", { timeout: 5000 });
    const readonlyField = page.getByTestId("misc-kv-tmux-prefix_key-readonly");
    await expect(readonlyField).toContainText("prefix_key:");
    await expect(readonlyField).toContainText("Ctrl+B");
  });

  test("misc section shows non-managed number as read-only", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-kv-git_master-max_depth-readonly']", { timeout: 5000 });
    const readonlyField = page.getByTestId("misc-kv-git_master-max_depth-readonly");
    await expect(readonlyField).toContainText("max_depth:");
    await expect(readonlyField).toContainText("5");
  });

  test("misc section shows non-managed object as preformatted JSON", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-kv-tmux-nested-readonly']", { timeout: 5000 });
    const readonlyField = page.getByTestId("misc-kv-tmux-nested-readonly");
    await expect(readonlyField).toContainText("nested:");
    await expect(readonlyField.locator("pre")).toContainText('"key": "value"');
  });

  test("non-managed fields do not have input elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-section-tmux']", { timeout: 5000 });
    const prefixInput = page.locator('[data-testid="misc-tmux-prefix_key"]');
    await expect(prefixInput).toHaveCount(0);
  });
});
