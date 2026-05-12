import { test, expect } from "@playwright/test";

test.describe("Collapse Controls", () => {
  const mockProfiles = {
    profiles: [{ id: "default", label: "Default" }],
  };

  const mockProfileDetail = {
    baseline: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: { tmux: { enabled: true } },
    },
    editable: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: { tmux: { enabled: true } },
    },
    effective: {
      agents: { build: { model: "gpt-4" }, oracle: { model: "gpt-4" } },
      categories: { deep: { model: "gpt-4" } },
      misc: { tmux: { enabled: true } },
    },
    readonlyTail: { version: 1 },
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4"],
    rawMisc: { tmux: { enabled: true } },
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

  test("toggle-all-button is visible in nav", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("toggle-all-button")).toBeVisible({ timeout: 5000 });
  });

  test("toggle-all-button initially shows Collapse All when everything is expanded", async ({ page }) => {
    await page.goto("/");
    const toggleBtn = page.getByTestId("toggle-all-button");
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await expect(toggleBtn).toHaveAttribute("aria-label", "Collapse All Sections");
  });

  test("clicking toggle-all collapses all agent cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-agents']", { timeout: 5000 });

    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "false");
  });

  test("clicking toggle-all again restores all agent cards after collapse", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-agents']", { timeout: 5000 });

    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("toggle-all-button")).toHaveAttribute("aria-label", "Expand All Sections");

    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("toggle-all-button")).toHaveAttribute("aria-label", "Collapse All Sections");
  });

  test("collapsing also collapses misc sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-misc']", { timeout: 5000 });

    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "true");
    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "false");
  });

  test("nav agent sub-item click expands collapsed agent and scrolls to it", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-agents']", { timeout: 5000 });

    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "false");

    await page.getByTestId("nav-link-agent-build").click();
    await expect(page.getByTestId("toggle-section-agents")).toHaveAttribute("aria-expanded", "true");
  });

  test("nav category sub-item click expands collapsed categories section", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-categories']", { timeout: 5000 });

    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-categories")).toHaveAttribute("aria-expanded", "false");

    await page.getByTestId("nav-link-category-deep").click();
    await expect(page.getByTestId("toggle-section-categories")).toHaveAttribute("aria-expanded", "true");
  });

  test("nav misc sub-item click expands collapsed misc section", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='toggle-section-misc']", { timeout: 5000 });

    await page.getByTestId("toggle-all-button").click();
    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "false");

    await page.getByTestId("nav-link-misc-tmux").click();
    await expect(page.getByTestId("toggle-section-misc")).toHaveAttribute("aria-expanded", "true");
  });
});
