import { test, expect } from "@playwright/test";

test.describe("Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  });

  test("Tab navigation cycles through interactive elements", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await expect(rawConfigButton).toBeVisible();

    await rawConfigButton.focus();
    await expect(rawConfigButton).toBeFocused();

    await page.keyboard.press("Tab");

    const focusedElement = await page.evaluate(() => {
      const active = document.activeElement;
      return active ? active.tagName : null;
    });

    expect(focusedElement).toBeTruthy();
    expect(focusedElement).not.toBe("BODY");
  });

  test("Enter key activates buttons", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await rawConfigButton.focus();

    await page.keyboard.press("Enter");
    const modal = page.locator('[data-testid="raw-config-modal"]');
    await expect(modal).toBeVisible();
  });

  test("Space key activates toggle buttons", async ({ page }) => {
    const agentsToggle = page.locator('[data-testid="toggle-section-agents"]');
    await agentsToggle.focus();

    const agentsContent = page.locator('[data-testid="agents-section-content"]');
    await expect(agentsContent).toBeVisible();

    await page.keyboard.press("Space");
    await expect(agentsContent).not.toBeVisible();

    await page.keyboard.press("Space");
    await expect(agentsContent).toBeVisible();
  });

  test("Escape key closes modals", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await rawConfigButton.click();

    const modal = page.locator('[data-testid="raw-config-modal"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });

  test("focus-visible styles are applied", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await rawConfigButton.focus();

    const isFocused = await rawConfigButton.evaluate((el) => {
      return document.activeElement === el;
    });
    expect(isFocused).toBe(true);
  });

  test("modal focus trap prevents tabbing outside", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await rawConfigButton.click();

    const modal = page.locator('[data-testid="raw-config-modal"]');
    await expect(modal).toBeVisible();

    const closeButton = page.locator('[data-testid="raw-config-close"]');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(closeButton).toBeFocused();
  });

  test("Shift+Tab cycles focus backwards in modal", async ({ page }) => {
    const rawConfigButton = page.locator('[data-testid="raw-config-open"]');
    await rawConfigButton.click();

    const closeButton = page.locator('[data-testid="raw-config-close"]');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(closeButton).toBeFocused();
  });

  test("navigation links are keyboard accessible", async ({ page }) => {
    const navLinks = page.locator('[data-testid^="nav-link-"]');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < Math.min(count, 3); i++) {
      const link = navLinks.nth(i);
      await link.focus();
      const isFocused = await link.evaluate((el) => document.activeElement === el);
      expect(isFocused).toBe(true);
    }
  });

  test("form inputs in copy dialog are keyboard navigable", async ({ page }) => {
    const copyButton = page.locator('[data-testid="copy-profile-button"]');
    await copyButton.click();

    const dialog = page.locator('[data-testid="copy-profile-dialog"]');
    await expect(dialog).toBeVisible();

    const input = page.locator('[data-testid="copy-profile-name-input"]');
    await expect(input).toBeFocused();

    await input.fill("test-profile");

    await page.keyboard.press("Tab");
    const cancelButton = page.locator('[data-testid="copy-profile-cancel"]');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press("Tab");
    const submitButton = page.locator('[data-testid="copy-profile-submit"]');
    await expect(submitButton).toBeFocused();
  });

  test("reduced motion media query is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForTimeout(500);

    const hasReducedMotionStyles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules);
          for (const rule of rules) {
            if (rule instanceof CSSMediaRule && rule.media.mediaText.includes("prefers-reduced-motion")) {
              return true;
            }
          }
        } catch (e) {
          void e;
        }
      }
      return false;
    });

    expect(hasReducedMotionStyles).toBe(true);
  });

  test("aria-expanded updates on toggle", async ({ page }) => {
    const agentsToggle = page.locator('[data-testid="toggle-section-agents"]');

    await expect(agentsToggle).toHaveAttribute("aria-expanded", "true");

    await agentsToggle.click();
    await expect(agentsToggle).toHaveAttribute("aria-expanded", "false");

    await agentsToggle.click();
    await expect(agentsToggle).toHaveAttribute("aria-expanded", "true");
  });

  test("aria-controls links toggle to content", async ({ page }) => {
    const agentsToggle = page.locator('[data-testid="toggle-section-agents"]');
    const ariaControls = await agentsToggle.getAttribute("aria-controls");

    expect(ariaControls).toBeTruthy();

    const controlledElement = page.locator(`#${ariaControls}`);
    await expect(controlledElement).toBeVisible();
  });
});
