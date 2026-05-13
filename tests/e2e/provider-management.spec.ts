import { test, expect } from "@playwright/test";

const mockProfiles = {
  profiles: [{ id: "profile-1", label: "Profile 1" }],
};

interface ProviderModel {
  name: string;
  config: { maxTokens: number };
}

interface ProviderEntry {
  name: string;
  models: ProviderModel[];
}

function buildProvidersResponse(providers: ProviderEntry[]) {
  return {
    providers: Object.fromEntries(
      providers.map((provider) => [
        provider.name,
        Object.fromEntries(
          provider.models.map((model) => [model.name, model.config])
        ),
      ])
    ),
    mtime: 1000,
  };
}

test.describe("Provider Management Lifecycle", () => {
  let providers: ProviderEntry[] = [];
  let lastPostProviderBody: { name: string } | null = null;
  let lastPostModelBody: Record<string, unknown> | null = null;
  let lastPutModelBody: Record<string, unknown> | null = null;
  let deletedModelKeys: string[] = [];
  let deletedProviderNames: string[] = [];

  function resetState() {
    providers = [
      { name: "test-provider", models: [{ name: "test-model", config: { maxTokens: 4096 } }] },
    ];
    lastPostProviderBody = null;
    lastPostModelBody = null;
    lastPutModelBody = null;
    deletedModelKeys = [];
    deletedProviderNames = [];
  }

  test.beforeEach(async ({ page }) => {
    resetState();

    await page.route("**/api/profiles", async (route) => {
      await route.fulfill({ json: mockProfiles });
    });

    await page.route("**/api/config/global", async (route) => {
      await route.fulfill({
        json: { syncReplaceEnabled: false, appZoomPercent: 100, defaultProfile: null },
      });
    });

    await page.route("**/api/config/providers", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: buildProvidersResponse(providers) });
      } else if (route.request().method() === "POST") {
        const body = await route.request().postDataJSON();
        lastPostProviderBody = body;
        providers.push({ name: body.name, models: [] });
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });

    await page.route(/\/api\/config\/providers\/[^/]+\/models$/, async (route) => {
      const segments = new URL(route.request().url()).pathname.split("/");
      const providerName = decodeURIComponent(segments.at(-2) ?? "");

      if (route.request().method() === "POST") {
        const body = await route.request().postDataJSON();
        lastPostModelBody = body;
        const provider = providers.find((p) => p.name === providerName);
        if (provider) {
          provider.models.push({ name: body.name, config: { maxTokens: body.maxTokens ?? 64000 } });
        }
        await route.fulfill({ json: { success: true, mtime: Date.now() } });
      } else {
        await route.continue();
      }
    });

    await page.route(
      /\/api\/config\/providers\/[^/]+\/models\/[^/]+$/,
      async (route) => {
        const segments = new URL(route.request().url()).pathname.split("/");
        const providerName = decodeURIComponent(segments.at(-3) ?? "");
        const modelName = decodeURIComponent(segments.at(-1) ?? "");

        if (route.request().method() === "PUT") {
          const body = await route.request().postDataJSON();
          lastPutModelBody = body;
          const provider = providers.find((p) => p.name === providerName);
          const model = provider?.models.find((m) => m.name === modelName);
          if (model && body.maxTokens !== undefined) {
            model.config.maxTokens = body.maxTokens;
          }
          await route.fulfill({ json: { success: true, mtime: Date.now() } });
        } else if (route.request().method() === "DELETE") {
          deletedModelKeys.push(`${providerName}/${modelName}`);
          const providerIndex = providers.findIndex((p) => p.name === providerName);
          if (providerIndex >= 0) {
            providers[providerIndex]!.models = providers[providerIndex]!.models.filter(
              (m) => m.name !== modelName
            );
          }
          await route.fulfill({ json: { success: true, mtime: Date.now() } });
        } else {
          await route.continue();
        }
      }
    );

    await page.route(
      /\/api\/config\/providers\/[^/]+$/,
      async (route) => {
        const providerName = decodeURIComponent(
          new URL(route.request().url()).pathname.split("/").at(-1) ?? ""
        );

        if (route.request().method() === "DELETE") {
          deletedProviderNames.push(providerName);
          providers = providers.filter((p) => p.name !== providerName);
          await route.fulfill({ json: { success: true, mtime: Date.now() } });
        } else {
          await route.continue();
        }
      }
    );
  });

  test("create provider, create model, edit maxTokens", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    // Initial state: should have test-provider with test-model
    await expect(page.locator('[data-testid="provider-section-test-provider"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-row-test-provider-test-model"]')).toBeVisible();

    // Create a new provider
    const nameInput = page.locator('[data-testid="provider-create-input"]');
    await nameInput.fill("my-custom-provider");
    await page.locator('[data-testid="provider-create-submit"]').click();

    await expect(page.locator('[data-testid="provider-section-my-custom-provider"]')).toBeVisible();
    expect(lastPostProviderBody).toEqual({ name: "my-custom-provider" });

    // Create a model under the new provider
    const modelNameInput = page.locator('[data-testid="model-create-input-my-custom-provider"]');
    await modelNameInput.fill("my-model");

    const maxTokensInput = page.locator('[data-testid="model-max-tokens-my-custom-provider-new"]');
    await maxTokensInput.fill("8192");

    await page.locator('[data-testid="model-create-submit-my-custom-provider"]').click();

    await expect(page.locator('[data-testid="model-row-my-custom-provider-my-model"]')).toBeVisible();
    expect(lastPostModelBody).toEqual({ name: "my-model", maxTokens: 8192 });

    // Edit maxTokens of the new model
    await page.locator('[data-testid="model-max-tokens-my-custom-provider-my-model"]').click();

    await page.waitForTimeout(100);
    const textField = page.locator('[data-testid="model-max-tokens-my-custom-provider-my-model"]');
    await textField.fill("16384");

    await page.locator('[data-testid="model-save-my-custom-provider-my-model"]').click();

    expect(lastPutModelBody).toEqual({ maxTokens: 16384 });
    await expect(page.locator('[data-testid="model-max-tokens-my-custom-provider-my-model"]')).toContainText("16384");
  });

  test("validation failure for invalid provider name", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    const nameInput = page.locator('[data-testid="provider-create-input"]');

    // Empty name should disable submit
    await nameInput.fill("");
    await expect(page.locator('[data-testid="provider-create-submit"]')).toBeDisabled();

    // Type name and submit - should succeed
    await nameInput.fill("valid-provider");
    await page.locator('[data-testid="provider-create-submit"]').click();
    await expect(page.locator('[data-testid="provider-section-valid-provider"]')).toBeVisible();
  });

  test("validation failure for invalid maxTokens", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    // Start editing maxTokens on existing model
    await page.locator('[data-testid="model-max-tokens-test-provider-test-model"]').click();

    const textField = page.locator('[data-testid="model-max-tokens-test-provider-test-model"]');
    await textField.fill("-1");

    await page.locator('[data-testid="model-save-test-provider-test-model"]').click();

    // Should show error state, not call PUT
    await expect(textField).toHaveValue("-1");
    // Verify no PUT was made with invalid data
    expect(lastPutModelBody).toBeNull();
  });

  test("referenced delete - provider delete shows confirmation", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    // Click delete on provider
    await page.locator('[data-testid="provider-delete-test-provider"]').click();

    // Confirm dialog should appear
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).toContainText("Delete Provider");
    await expect(page.locator('[data-testid="confirm-dialog-description"]')).toContainText("test-provider");

    // Cancel delete
    await page.locator('[data-testid="confirm-dialog-cancel"]').click();
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).not.toBeVisible();

    // Provider should still exist
    await expect(page.locator('[data-testid="provider-section-test-provider"]')).toBeVisible();
    expect(deletedProviderNames).toHaveLength(0);

    // Now confirm delete
    await page.locator('[data-testid="provider-delete-test-provider"]').click();
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).toBeVisible();
    await page.locator('[data-testid="confirm-dialog-confirm"]').click();

    await expect(page.locator('[data-testid="provider-section-test-provider"]')).not.toBeVisible();
    expect(deletedProviderNames).toContain("test-provider");
  });

  test("delete model full flow", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    // Click delete on model
    await page.locator('[data-testid="model-delete-test-provider-test-model"]').click();

    // Confirm dialog should appear
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirm-dialog-title"]')).toContainText("Delete Model");
    await expect(page.locator('[data-testid="confirm-dialog-description"]')).toContainText("test-model");

    // Confirm delete
    await page.locator('[data-testid="confirm-dialog-confirm"]').click();

    // Model row should be gone
    await expect(page.locator('[data-testid="model-row-test-provider-test-model"]')).not.toBeVisible();
    expect(deletedModelKeys).toContain("test-provider/test-model");
  });

  test("full cycle: create provider, add model, edit, delete model, delete provider", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="providers-editor"]', { state: "visible" });

    // 1. Create provider
    await page.locator('[data-testid="provider-create-input"]').fill("cycle-provider");
    await page.locator('[data-testid="provider-create-submit"]').click();
    await expect(page.locator('[data-testid="provider-section-cycle-provider"]')).toBeVisible();

    // 2. Add model
    await page.locator('[data-testid="model-create-input-cycle-provider"]').fill("cycle-model");
    await page.locator('[data-testid="model-max-tokens-cycle-provider-new"]').fill("32000");
    await page.locator('[data-testid="model-create-submit-cycle-provider"]').click();
    await expect(page.locator('[data-testid="model-row-cycle-provider-cycle-model"]')).toBeVisible();

    // 3. Edit maxTokens
    await page.locator('[data-testid="model-max-tokens-cycle-provider-cycle-model"]').click();
    const textField = page.locator('[data-testid="model-max-tokens-cycle-provider-cycle-model"]');
    await textField.fill("64000");
    await page.locator('[data-testid="model-save-cycle-provider-cycle-model"]').click();
    await expect(page.locator('[data-testid="model-max-tokens-cycle-provider-cycle-model"]')).toContainText("64000");

    // 4. Delete model
    await page.locator('[data-testid="model-delete-cycle-provider-cycle-model"]').click();
    await page.locator('[data-testid="confirm-dialog-confirm"]').click();
    await expect(page.locator('[data-testid="model-row-cycle-provider-cycle-model"]')).not.toBeVisible();

    // 5. Delete provider
    await page.locator('[data-testid="provider-delete-cycle-provider"]').click();
    await page.locator('[data-testid="confirm-dialog-confirm"]').click();
    await expect(page.locator('[data-testid="provider-section-cycle-provider"]')).not.toBeVisible();
  });
});
