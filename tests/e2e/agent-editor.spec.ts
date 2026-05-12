import { test, expect } from "@playwright/test";

test.describe("Agent Editor", () => {
  const mockProfiles = {
    profiles: [
      { id: "profile-1", label: "Profile 1" },
    ]
  };

  const mockProfileDetail = {
    baseline: { agents: {}, categories: {}, misc: {} },
    editable: { agents: {}, categories: {}, misc: {} },
    effective: { agents: {}, categories: {}, misc: {} },
    readonlyTail: { foo: "bar" },
    mtime: 1000,
    errors: [],
    availableModels: ["gpt-4", "gpt-4o", "claude-3"]
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

  test("adds a custom agent via nav dialog, displays custom role note, and saves", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("agent-editor")).toBeVisible();

    const customAgentId = "my_custom_agent_123";

    // Open agent creation dialog via nav
    await page.getByTestId("nav-add-agent-btn").click();

    // Fill in the agent ID
    await page.getByTestId("new-agent-id-input").fill(customAgentId);

    // Submit the form
    await page.getByTestId("create-agent-submit").click();

    // Verify the new agent card is visible
    const newCard = page.getByTestId(`agent-card-${customAgentId}`);
    await expect(newCard).toBeVisible();

    // Verify custom role note is displayed
    const roleNote = page.getByTestId(`agent-role-${customAgentId}`);
    await expect(roleNote).toContainText("自定义 Agent");

    // Save should be enabled
    const saveButton = page.getByTestId("save-button");
    await expect(saveButton).toBeEnabled();

    await saveButton.click();

    const successMsg = page.getByTestId("status-success");
    await expect(successMsg).toBeVisible();
    await expect(successMsg).toContainText("Saved successfully");

    // Verify agent still visible after save
    await expect(page.getByTestId(`agent-card-${customAgentId}`)).toBeVisible();

    // Delete the agent
    const deleteBtn = page.getByTestId(`delete-agent-${customAgentId}`);
    await deleteBtn.click();

    // Confirm the delete dialog
    const confirmDialog = page.getByTestId("confirm-dialog");
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });
    await page.getByTestId("confirm-dialog-confirm").click();

    // Save again
    await saveButton.click();

    // Verify agent is removed
    await expect(page.getByTestId(`agent-card-${customAgentId}`)).not.toBeVisible();
  });
});
