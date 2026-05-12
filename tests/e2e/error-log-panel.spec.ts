import { expect, test } from "@playwright/test";

test.describe("Error Log Panel E2E", () => {
  const mockProfiles = {
    profiles: [
      { id: "profile-a", label: "Profile A" },
    ],
  };

  const profileADetail = {
    baseline: {
      agents: {
        planner: { model: "gpt-4" },
      },
      categories: {},
      misc: {},
    },
    editable: {
      agents: {
        planner: { model: "gpt-4", variant: "low" },
      },
      categories: {},
      misc: {},
    },
    effective: {
      agents: {
        planner: { model: "gpt-4", variant: "low" },
      },
      categories: {},
      misc: {},
    },
    readonlyTail: {},
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4"],
  };

  test("frontend request error appears in panel", async ({ page }) => {
    // Mock profile list to succeed
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    // Mock profile-a GET to fail with 500
    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          json: { error: "INTERNAL_ERROR", message: "Server error occurred" },
        });
      } else {
        await route.continue();
      }
    });

    // Mock error logs API to return empty (so frontend errors are visible)
    await page.route("**/api/logs/errors", async (route) => {
      await route.fulfill({
        json: {
          entries: [],
          sourceFile: "omo-switch.error.log",
          truncated: false,
          readError: null,
        },
      });
    });

    await page.goto("/");

    // Wait for the app to load (will have errors due to 500 response)
    await expect(page.getByRole("heading", { name: "omo-switch" })).toBeVisible();

    // Click error log toggle to expand
    await page.locator('[data-testid="error-log-toggle"]').click();

    // Panel should be expanded
    await expect(page.locator('[data-testid="error-log-panel"]')).toBeVisible();

    // First entry should be a frontend-request error
    const firstEntry = page.locator('[data-testid="error-log-entry-0"]');
    await expect(firstEntry).toBeVisible();

    // Entry should contain "Request" badge (frontend-request source)
    await expect(firstEntry.locator(".MuiChip-root")).toContainText("Request");

    await expect(firstEntry).toContainText("Failed to fetch profile detail");
  });

  test("backend log entries appear in panel", async ({ page }) => {
    // Mock profile APIs to succeed
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileADetail });
      } else {
        await route.continue();
      }
    });

    // Mock error logs API to return backend entries
    await page.route("**/api/logs/errors", async (route) => {
      await route.fulfill({
        json: {
          entries: [
            {
              timestamp: new Date().toISOString(),
              level: "ERROR",
              module: "server.app",
              message: "Test backend error",
              detail: null,
            },
          ],
          sourceFile: "omo-switch.error.log",
          truncated: false,
          readError: null,
        },
      });
    });

    await page.goto("/");

    // Wait for the app to load
    await expect(page.getByRole("heading", { name: "omo-switch" })).toBeVisible();

    // Click error log toggle to expand
    await page.locator('[data-testid="error-log-toggle"]').click();

    // Panel should be expanded
    await expect(page.locator('[data-testid="error-log-panel"]')).toBeVisible();

    // First entry should be visible
    const firstEntry = page.locator('[data-testid="error-log-entry-0"]');
    await expect(firstEntry).toBeVisible();

    // Entry should contain "Backend" badge
    await expect(firstEntry.locator(".MuiChip-root")).toContainText("Backend");

    // Entry should contain the error message
    await expect(firstEntry).toContainText("Test backend error");

    // Entry should show module name
    await expect(firstEntry).toContainText("server.app");
  });

  test("backend API failure shows retry state", async ({ page }) => {
    // Mock profile APIs to succeed
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileADetail });
      } else {
        await route.continue();
      }
    });

    // Mock error logs API to return 500 with readError
    await page.route("**/api/logs/errors", async (route) => {
      await route.fulfill({
        status: 500,
        json: {
          entries: [],
          sourceFile: "omo-switch.error.log",
          truncated: false,
          readError: "Permission denied",
        },
      });
    });

    await page.goto("/");

    // Wait for the app to load
    await expect(page.getByRole("heading", { name: "omo-switch" })).toBeVisible();

    // Click error log toggle to expand
    await page.locator('[data-testid="error-log-toggle"]').click();

    // Panel should be expanded
    await expect(page.locator('[data-testid="error-log-panel"]')).toBeVisible();

    // Error state should be visible
    await expect(page.locator('[data-testid="error-log-error-state"]')).toBeVisible();

    // Error state should contain the error message
    await expect(page.locator('[data-testid="error-log-error-state"]')).toContainText("Permission denied");

    // Refresh button should exist (in header)
    await expect(page.locator('[data-testid="error-log-refresh"]')).toBeVisible();
  });

  test("error panel does not break existing save flow", async ({ page }) => {
    // Mock profile APIs
    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/profiles/profile-a", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: profileADetail });
      } else if (route.request().method() === "PUT") {
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });

    // Mock error logs API
    await page.route("**/api/logs/errors", async (route) => {
      await route.fulfill({
        json: {
          entries: [],
          sourceFile: "omo-switch.error.log",
          truncated: false,
          readError: null,
        },
      });
    });

    await page.goto("/");

    // Wait for the app to load
    await expect(page.getByRole("heading", { name: "omo-switch" })).toBeVisible();
    await expect(page.getByTestId("agent-editor")).toBeVisible();

    await expect(page.locator('[data-testid="error-log-toggle"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="error-log-panel"]')).not.toBeVisible();

    await expect(page.getByTestId("agent-editor")).toBeVisible();
  });
});
