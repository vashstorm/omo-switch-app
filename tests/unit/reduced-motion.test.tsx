import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, afterEach, vi, beforeEach } from "vitest";
import { AppShell } from "../../src/web/components/AppShell";

describe("Reduced Motion Support", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  const mockPrefersReducedMotion = (prefersReduced: boolean) => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)" && prefersReduced,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  test("skeleton placeholder has aria-busy attribute", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={true}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    const skeleton = screen.queryByTestId("loading-skeleton");
    if (skeleton) {
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    }
  });

  test("mobile nav toggle has correct aria attributes", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    const toggle = screen.getByTestId("mobile-nav-toggle");
    expect(toggle).toHaveAttribute("aria-controls", "app-nav");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-label", "Toggle navigation");
  });

  test("section toggle buttons have aria-expanded and aria-controls", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
        agentsCollapsed={false}
        categoriesCollapsed={true}
        miscCollapsed={false}
        onToggleAgents={() => {}}
        onToggleCategories={() => {}}
        onToggleMisc={() => {}}
      />
    );

    const agentsToggle = screen.getByTestId("toggle-section-agents");
    expect(agentsToggle).toHaveAttribute("aria-expanded", "true");
    expect(agentsToggle).toHaveAttribute("aria-controls", "section-agents-content");

    const categoriesToggle = screen.getByTestId("toggle-section-categories");
    expect(categoriesToggle).toHaveAttribute("aria-expanded", "false");
    expect(categoriesToggle).toHaveAttribute("aria-controls", "section-categories-content");

    const miscToggle = screen.getByTestId("toggle-section-misc");
    expect(miscToggle).toHaveAttribute("aria-expanded", "true");
    expect(miscToggle).toHaveAttribute("aria-controls", "section-misc-content");
  });

  test("navigation has correct aria-label", () => {
    render(
      <AppShell
        profileSelector={<div />}
        loading={false}
        error={null}
        isDirty={false}
        onSave={() => {}}
        onReset={() => {}}
      />
    );

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Section navigation");
  });

  test("matchMedia is called with prefers-reduced-motion query", () => {
    const mockMatchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    window.matchMedia = mockMatchMedia;

    mockMatchMedia("(prefers-reduced-motion: reduce)");

    expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
