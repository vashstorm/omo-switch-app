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

  test("misc section shows object values as editable JSON", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-tmux-value-json']", { timeout: 5000 });
    const objectEditor = page.getByTestId("misc-tmux-value-json");
    await expect(objectEditor).toBeVisible();
    await expect(objectEditor).toHaveValue(/"enabled": true/);
  });

  test("object editor includes custom string fields", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-tmux-value-json']", { timeout: 5000 });
    await expect(page.getByTestId("misc-tmux-value-json")).toHaveValue(/"prefix_key": "Ctrl\+B"/);
  });

  test("object editor includes custom number fields", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-git_master-value-json']", { timeout: 5000 });
    await expect(page.getByTestId("misc-git_master-value-json")).toHaveValue(/"max_depth": 5/);
  });

  test("object editor includes nested object fields", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-tmux-value-json']", { timeout: 5000 });
    await expect(page.getByTestId("misc-tmux-value-json")).toHaveValue(/"nested"/);
    await expect(page.getByTestId("misc-tmux-value-json")).toHaveValue(/"key": "value"/);
  });

  test("object values do not expose nested field controls", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='misc-section-tmux']", { timeout: 5000 });
    const prefixInput = page.locator('[data-testid="misc-tmux-prefix_key"]');
    await expect(prefixInput).toHaveCount(0);
  });
});
